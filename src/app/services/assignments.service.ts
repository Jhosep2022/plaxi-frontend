import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FileUploadService } from '../core/api/file-upload.service';
import { SessionService } from '../core/auth/session.service';
import type { IconoMateria } from '../core/models/academics.model';
import type { Entrega, EstadoEntrega, Tarea } from '../core/models/assignments.model';
import type { Tono } from '../shared/dashboard/dashboard.models';

export const ENTREGA_MAX_MB = 10;

// Tarea con lo que se necesita para mostrarla
export interface TareaInfo extends Tarea {
  tipoAula: 'clase' | 'curso';
  paraleloId: number | null;
  materiaId: number | null;
  aula: string;
  materia: { id: number; nombre: string; icono: IconoMateria; tono: Tono }; // en la academia, el curso hace de materia
  curso: string;
  docente: string;
  criterio: string; // criterio de la planilla donde se califica ('' si no cuenta para la nota)
  actividadNombre: string; // nombre de esa actividad en la planilla
  cerrado: boolean; // el periodo de su nota está cerrado
  notaMaxima: number;
}

export interface TareaDocente extends TareaInfo {
  estudiantes: number;
  entregadas: number;
  tarde: number;
  porRevisar: number;
  revisadas: number;
}

export interface EstudianteAula {
  usuarioId: number; // la entrega y la revisión van con la cuenta
  personaId: number | null; // ficha del colegio; null en la academia
  nombre: string;
}

export interface FilaEntrega {
  estudiante: EstudianteAula;
  entrega: Entrega | null;
  estado: EstadoEntrega;
  nota: number | null;
}

export interface TareaDeEstudiante {
  tarea: TareaInfo;
  entrega: Entrega | null;
  estado: EstadoEntrega;
  nota: number | null; // se ve apenas el docente revisa
  puedeEntregar: boolean;
}

export interface RevisionEntrega {
  usuarioId: number;
  nota: number | null; // solo si la tarea cuenta para la nota
  comentario: string;
}

export interface NuevaTarea {
  aulaId: number;
  titulo: string;
  instrucciones: string;
  entrega: string;
  hora: string;
  aceptaTardias: boolean;
}

// Tareas de los docentes en sus aulas (clases del colegio o cursos de la academia), entregas de los estudiantes y su revisión.
// En el colegio la nota puede ir a la planilla de Calificaciones (el servidor crea la actividad); en la academia la revisión es un comentario.
@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly archivos = inject(FileUploadService);
  private readonly session = inject(SessionService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  // ---------- Docente ----------
  tareasDocente(_espacioId?: number, _docenteId?: number): Observable<TareaDocente[]> {
    return this.http
      .get<TareaDocente[]>(`${this.base}/tareas`, { params: { rol: 'docente' } })
      .pipe(map((tareas) => [...tareas].sort((a, b) => b.entrega.localeCompare(a.entrega))));
  }

  detalle(tareaId: number): Observable<{ tarea: TareaInfo; filas: FilaEntrega[]; cerrado: boolean }> {
    return this.http
      .get<{ tarea: TareaInfo; filas: FilaEntrega[] }>(`${this.base}/tareas/${tareaId}`)
      .pipe(map((d) => ({ ...d, cerrado: d.tarea.cerrado })));
  }

  // Crea la tarea; con un criterio, el servidor también crea su actividad en la planilla de notas
  crear(datos: NuevaTarea, criterioId: number): Observable<Tarea> {
    if (!datos.titulo.trim()) return throwError(() => new Error('Ponle un título a la tarea.'));
    const { aulaId, ...cuerpo } = datos;
    return this.http.post<Tarea>(`${this.base}/aulas/${aulaId}/tareas`, {
      ...cuerpo,
      titulo: datos.titulo.trim(),
      instrucciones: datos.instrucciones.trim(),
      ...(criterioId ? { criterioId } : {}),
    });
  }

  // Elimina la tarea y sus entregas (la actividad de la planilla se quita solo si todavía no tiene notas)
  eliminar(tarea: Pick<Tarea, 'id'>): Observable<void> {
    return this.http.delete(`${this.base}/tareas/${tarea.id}`).pipe(map(() => undefined));
  }

  // Guarda la revisión: comentario, entrega revisada y nota (en la planilla, si la tarea cuenta para la nota)
  revisar(tareaId: number, revisiones: RevisionEntrega[]): Observable<number> {
    return this.http
      .put<{ revisadas: number }>(`${this.base}/tareas/${tareaId}/revision`, {
        revisiones: revisiones.map((r) => ({ usuarioId: r.usuarioId, nota: r.nota, comentario: r.comentario.trim() })),
      })
      .pipe(map((r) => r.revisadas));
  }

  // ---------- Estudiante y padre ----------
  // El estudiante ve las suyas; el padre, las del hijo elegido (su ficha)
  tareasDeEstudiante(_espacioId?: number, hijoId?: number): Observable<TareaDeEstudiante[]> {
    const padre = this.session.activeRole() === 'padre';
    const params: Record<string, string | number> = padre ? { rol: 'padre', ...(hijoId ? { hijo: hijoId } : {}) } : { rol: 'estudiante' };
    return this.http
      .get<TareaDeEstudiante[]>(`${this.base}/tareas`, { params })
      .pipe(map((lista) => [...lista].sort((a, b) => a.tarea.entrega.localeCompare(b.tarea.entrega) || a.tarea.hora.localeCompare(b.tarea.hora))));
  }

  // Entrega o reemplaza la entrega: sube los archivos nuevos y manda los que se conservan
  entregar(tareaId: number, texto: string, nuevos: File[], conservados: number[] = []): Observable<Entrega> {
    if (!texto.trim() && !nuevos.length && !conservados.length) return throwError(() => new Error('Escribe un comentario o adjunta un archivo.'));
    const grande = nuevos.find((f) => f.size > ENTREGA_MAX_MB * 1024 * 1024);
    if (grande) return throwError(() => new Error(`${grande.name} pesa más de ${ENTREGA_MAX_MB} MB.`));
    const subidas$ = nuevos.length ? forkJoin(nuevos.map((f) => this.archivos.upload('entrega', f, tareaId))) : of([] as number[]);
    return subidas$.pipe(
      switchMap((ids) =>
        this.http.put<Entrega>(`${this.base}/tareas/${tareaId}/entrega`, {
          texto: texto.trim(),
          archivos: [...conservados, ...ids].map((archivoId) => ({ archivoId })),
        }),
      ),
    );
  }

  // Enlace temporal para descargar un archivo de una entrega
  enlaceArchivo(archivoId: number): Observable<string> {
    return this.archivos.downloadUrl(archivoId);
  }
}
