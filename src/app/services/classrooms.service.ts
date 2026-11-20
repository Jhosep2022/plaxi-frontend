import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FileUploadService } from '../core/api/file-upload.service';
import { AcademyCourseApiService } from '../core/api/academy-course-api.service';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import type { Aula, Tema, Unidad } from '../core/models/classrooms.model';
import { calculatePercentage } from '../core/utils/reports';

export interface Anillo {
  label: string;
  valor: number | null; // porcentaje (null = sin datos)
}

// Aula con lo que muestran las tarjetas de la lista
export interface AulaResumen extends Aula {
  curso: string; // "3ro A · Secundaria" o la categoría del curso
  docente: string;
  estudiantes: number;
  unidades: number;
  temas: number;
  tareas: number;
  quiz: number;
  pendientes: number; // docente: entregas por revisar · estudiante: tareas por entregar
  chips: string[];
  anillos: [Anillo, Anillo];
}

export interface UnidadConTemas extends Unidad {
  temas: Tema[];
}

// Otra aula de la misma materia (otro paralelo) a la que el docente puede copiar contenido
export interface AulaHermana {
  id: number;
  nombre: string;
  curso: string;
}

export interface ProgresoEstudiante {
  estudianteId: number; // cuenta del estudiante
  personaId: number | null; // ficha del colegio (null en la academia)
  nombre: string;
  porcentaje: number;
}

export const PORTADA_MAX_KB = 800;
export const PDF_TEMA_MAX_MB = 20;

// Aulas virtuales (clases del colegio y cursos de academia) y su contenido: unidades, temas y progreso.
// El servidor decide qué ve cada rol: el docente todo (con borradores); el estudiante y el padre, lo publicado.
@Injectable({ providedIn: 'root' })
export class ClassroomsService {
  private http = inject(HttpClient);
  private api = inject(AcademyCourseApiService);
  private session = inject(SessionService);
  private archivos = inject(FileUploadService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  // ---------- Listas ----------
  aulasDocente(_espacioId?: number, _docenteId?: number): Observable<AulaResumen[]> {
    return this.api.list('docente').pipe(map((aulas) => [...aulas].sort((a, b) => b.actualizado.localeCompare(a.actualizado))));
  }

  // El estudiante ve sus aulas; anillos: su avance en el contenido y sus tareas al día
  aulasEstudiante(_espacioId?: number, _estudianteId?: number): Observable<AulaResumen[]> {
    return this.api.list('estudiante').pipe(
      map((aulas) =>
        aulas
          .map((a): AulaResumen => ({
            ...a,
            anillos: [
              { label: 'Mi progreso', valor: a.anillos[0].valor },
              { label: 'Tareas al día', valor: a.tareas ? calculatePercentage(a.tareas - a.pendientes, a.tareas) : null },
            ],
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      ),
    );
  }

  aula(aulaId: number): Observable<AulaResumen> {
    return this.api.detail(aulaId);
  }

  // Portada propia o vuelta a la ilustración por defecto ('')
  cambiarPortada(aulaId: number, portada: string): Observable<string> {
    if (portada.length > PORTADA_MAX_KB * 1024 * 1.37) return throwError(() => new Error(`La imagen debe pesar menos de ${PORTADA_MAX_KB} KB.`));
    return this.http.put<{ portada: string }>(`${this.base}/aulas/${aulaId}/portada`, { portada }).pipe(map((r) => r.portada));
  }

  // ---------- Contenido ----------
  // Para el estudiante el servidor manda solo lo publicado; de una unidad bloqueada, solo los títulos
  contenido(aulaId: number): Observable<UnidadConTemas[]> {
    return this.http.get<UnidadConTemas[]>(`${this.base}/aulas/${aulaId}/contenido`).pipe(
      map((unidades) =>
        unidades.map((u) => ({
          ...u,
          temas: u.temas.map((t) => ({ ...t, contenido: t.contenido ?? '', url: t.url ?? '', archivoId: t.archivoId ?? null, publicado: t.publicado ?? true })),
        })),
      ),
    );
  }

  // Temas que vio el estudiante que pregunta
  progresoDe(aulaId: number): Observable<Set<number>> {
    return this.http.get<{ vistos: number[] }>(`${this.base}/aulas/${aulaId}/progreso`).pipe(map((p) => new Set(p.vistos ?? [])));
  }

  // Porcentaje de temas publicados que vio cada estudiante del aula (docente)
  progresoGrupo(aulaId: number): Observable<ProgresoEstudiante[]> {
    return this.http
      .get<{ estudiantes: { usuarioId: number; personaId: number | null; nombre: string; porcentaje: number }[] }>(`${this.base}/aulas/${aulaId}/progreso`)
      .pipe(
        map((grupo) =>
          (grupo.estudiantes ?? [])
            .map((e) => ({ estudianteId: e.usuarioId, personaId: e.personaId, nombre: e.nombre, porcentaje: e.porcentaje }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        ),
      );
  }

  marcarVisto(temaId: number): Observable<void> {
    return this.http.post(`${this.base}/temas/${temaId}/visto`, {}).pipe(map(() => undefined));
  }

  guardarUnidad(unidad: Omit<Unidad, 'id' | 'orden'> & { id?: number }): Observable<Unidad> {
    if (!unidad.titulo.trim()) return throwError(() => new Error('Ponle un título a la unidad.'));
    const cuerpo = { titulo: unidad.titulo.trim(), descripcion: unidad.descripcion ?? '', publicada: unidad.publicada, requiereAnterior: unidad.requiereAnterior };
    return unidad.id
      ? this.http.put<Unidad>(`${this.base}/unidades/${unidad.id}`, cuerpo)
      : this.http.post<Unidad>(`${this.base}/aulas/${unidad.aulaId}/unidades`, cuerpo);
  }

  eliminarUnidad(unidad: Pick<Unidad, 'id'>): Observable<void> {
    return this.http.delete(`${this.base}/unidades/${unidad.id}`).pipe(map(() => undefined));
  }

  moverUnidad(unidad: Pick<Unidad, 'id'>, direccion: -1 | 1): Observable<void> {
    return this.http.post(`${this.base}/unidades/${unidad.id}/mover`, { direccion }).pipe(map(() => undefined));
  }

  // Guarda el tema. Un PDF se sube después de crear el tema (el archivo va unido a él) y, si el docente
  // lo quería publicado, se publica recién cuando el PDF ya está: el estudiante nunca ve un PDF vacío.
  guardarTema(tema: Omit<Tema, 'id' | 'orden' | 'archivoId'> & { id?: number; archivoId?: number | null }, pdf?: File | null): Observable<Tema> {
    if (!tema.titulo.trim()) return throwError(() => new Error('Ponle un título al tema.'));
    const esPdf = tema.tipo === 'pdf';
    if (!esPdf && tema.tipo !== 'texto' && !tema.url.trim()) return throwError(() => new Error('Indica el enlace del recurso.'));
    if (esPdf && !pdf && !tema.archivoId) return throwError(() => new Error('Sube el documento PDF.'));
    if (pdf && pdf.type !== 'application/pdf') return throwError(() => new Error('El documento debe ser un PDF.'));
    if (pdf && pdf.size > PDF_TEMA_MAX_MB * 1024 * 1024) return throwError(() => new Error(`El PDF debe pesar menos de ${PDF_TEMA_MAX_MB} MB.`));
    const cuerpo = (publicado: boolean) => ({
      titulo: tema.titulo.trim(), tipo: tema.tipo, contenido: tema.contenido, url: esPdf ? '' : tema.url.trim(), duracionMin: tema.duracionMin, publicado, unidadId: tema.unidadId,
    });
    const guardado$ = tema.id
      ? this.http.put<Tema>(`${this.base}/temas/${tema.id}`, cuerpo(tema.publicado))
      : this.http.post<Tema>(`${this.base}/unidades/${tema.unidadId}/temas`, cuerpo(tema.publicado));
    if (!esPdf || !pdf) return guardado$;
    return guardado$.pipe(
      switchMap((guardado) =>
        this.archivos.upload('tema', pdf, guardado.id).pipe(
          switchMap((archivoId) => this.archivos.link(archivoId)),
          switchMap(() => (tema.publicado ? this.http.put<Tema>(`${this.base}/temas/${guardado.id}`, cuerpo(true)) : of(guardado))),
        ),
      ),
    );
  }

  // Enlace temporal para ver el PDF de un tema
  enlacePdf(archivoId: number): Observable<string> {
    return this.archivos.downloadUrl(archivoId);
  }

  eliminarTema(tema: Pick<Tema, 'id'>): Observable<void> {
    return this.http.delete(`${this.base}/temas/${tema.id}`).pipe(map(() => undefined));
  }

  moverTema(tema: Pick<Tema, 'id'>, direccion: -1 | 1): Observable<void> {
    return this.http.post(`${this.base}/temas/${tema.id}/mover`, { direccion }).pipe(map(() => undefined));
  }

  // Aulas de la misma materia (otros paralelos) a las que el docente puede copiar el contenido
  aulasHermanas(aulaId: number): Observable<AulaHermana[]> {
    return this.http.get<AulaHermana[]>(`${this.base}/aulas/${aulaId}/hermanas`);
  }

  // Copia unidades y temas (como borrador) al final del contenido de otras aulas
  copiarContenido(origenId: number, unidadIds: number[], destinoIds: number[]): Observable<number> {
    if (!unidadIds.length || !destinoIds.length) return throwError(() => new Error('Elige qué unidades copiar y a qué paralelos.'));
    return this.http
      .post<{ copiadas: number }>(`${this.base}/aulas/${origenId}/copiar`, { unidades: unidadIds, destinos: destinoIds })
      .pipe(map((r) => r.copiadas));
  }
}
