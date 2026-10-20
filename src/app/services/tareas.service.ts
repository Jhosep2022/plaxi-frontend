import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';
import { Materia, paraleloLabel } from '../core/models/academico.model';
import { Estudiante } from '../core/models/asistencia.model';
import type { Entrega, EstadoEntrega, Tarea } from '../core/models/tareas.model';
import { hoyIso } from '../core/utils/asistencia';
import { periodoDeFecha } from '../core/utils/calificaciones';
import { ahoraIso, estadoEntrega } from '../core/utils/tareas';
import { MOCK_DOCENTES, MOCK_GESTIONES, MOCK_MATERIAS, MOCK_PARALELOS } from '../mocks/academico.mock';
import { MOCK_ESTUDIANTES } from '../mocks/asistencia.mock';
import { MOCK_AULAS_VIRTUALES, estudiantesDeAula } from '../mocks/aulas.mock';
import { MOCK_DELAY, MOCK_INSCRIPCIONES } from '../mocks/mock-data';
import { MOCK_ENTREGAS, MOCK_TAREAS } from '../mocks/tareas.mock';
import { CalificacionesService } from './calificaciones.service';
import { RepositorioMock } from './repositorio-mock';

export interface TareaInfo extends Tarea {
  materia: Materia;
  curso: string;
  docente: string;
  criterio: string; // criterio de la planilla donde se califica ('' si no cuenta para la nota)
  actividadNombre: string; // nombre de esa actividad en la planilla
  notaMaxima: number;
}

export interface TareaDocente extends TareaInfo {
  estudiantes: number;
  entregadas: number;
  tarde: number;
  porRevisar: number;
  revisadas: number;
}

export interface FilaEntrega {
  estudiante: Estudiante;
  entrega: Entrega | null;
  estado: EstadoEntrega;
  nota: number | null;
}

export interface TareaDeEstudiante {
  tarea: TareaInfo;
  entrega: Entrega | null;
  estado: EstadoEntrega;
  nota: number | null;
}

export interface RevisionEntrega {
  estudianteId: number;
  nota: number | null; // solo si la tarea cuenta para la nota
  comentario: string;
}

export type NuevaTarea = Pick<Tarea, 'aulaId' | 'titulo' | 'instrucciones' | 'entrega' | 'hora'>;

// Tareas de los docentes en sus aulas (clases del colegio o cursos de la academia), entregas de los estudiantes y su revisión.
// En el colegio la nota puede ir a la planilla de Calificaciones; en la academia la revisión es un comentario.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class TareasService {
  private calificaciones = inject(CalificacionesService);
  private tareasRepo = new RepositorioMock<Tarea>(MOCK_TAREAS);
  private entregasRepo = new RepositorioMock<Entrega>(MOCK_ENTREGAS);

  // ---------- Docente ----------
  tareasDocente(espacioId: number, docenteId: number): Observable<TareaDocente[]> {
    return from(this.infoDe(this.tareasRepo.ahora((t) => t.espacioId === espacioId && t.docenteId === docenteId))).pipe(
      map((tareas) =>
        tareas.map((t) => {
          const alumnos = this.alumnosDe(t);
          const entregas = this.entregasRepo.ahora((e) => e.tareaId === t.id);
          const estados = alumnos.map((a) => estadoEntrega(t, entregas.find((e) => e.estudianteId === a.id)));
          return {
            ...t,
            estudiantes: alumnos.length,
            entregadas: entregas.filter((e) => e.entregadaEl).length,
            tarde: estados.filter((s) => s === 'tarde').length,
            porRevisar: estados.filter((s) => s === 'entregada' || s === 'tarde').length,
            revisadas: estados.filter((s) => s === 'revisada').length,
          };
        }).sort((a, b) => b.entrega.localeCompare(a.entrega))
      ),
      delay(MOCK_DELAY)
    );
  }

  detalle(tareaId: number): Observable<{ tarea: TareaInfo; filas: FilaEntrega[]; cerrado: boolean } | null> {
    const t = this.tareasRepo.ahora((x) => x.id === tareaId)[0];
    if (!t) return of(null).pipe(delay(MOCK_DELAY));
    return from(this.infoDe([t])).pipe(
      switchMap(([tarea]) =>
        (t.actividadId ? this.calificaciones.notasDeActividad(t.actividadId) : of([])).pipe(
          map((notas) => ({
            tarea,
            cerrado: !!t.actividadId && this.calificaciones.actividadCerrada(t.actividadId),
            filas: this.alumnosDe(t).map((estudiante) => {
              const entrega = this.entregasRepo.ahora((e) => e.tareaId === t.id && e.estudianteId === estudiante.id)[0] ?? null;
              return {
                estudiante: structuredClone(estudiante),
                entrega: structuredClone(entrega),
                estado: estadoEntrega(t, entrega ?? undefined),
                nota: notas.find((n) => n.estudianteId === estudiante.id)?.valor ?? null,
              };
            }),
          }))
        )
      )
    );
  }

  // Crea la tarea; si se indica un criterio, también su actividad en la planilla de notas
  crear(espacioId: number, docenteId: number, datos: NuevaTarea, criterioId: number): Observable<Tarea> {
    if (!datos.titulo.trim()) return throwError(() => new Error('Ponle un título a la tarea.'));
    if (datos.entrega < hoyIso()) return throwError(() => new Error('La fecha de entrega no puede ser anterior a hoy.'));
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === datos.aulaId && a.espacioId === espacioId);
    if (!aula) return throwError(() => new Error('Elige una de tus clases.'));
    const tarea = {
      ...datos, paraleloId: aula.paraleloId, materiaId: aula.materiaId, titulo: datos.titulo.trim(), instrucciones: datos.instrucciones.trim(),
      espacioId, docenteId, asignada: hoyIso(), actividadId: 0,
    };
    if (!criterioId || aula.tipo !== 'clase') return this.tareasRepo.guardar(tarea);
    const gestion = MOCK_GESTIONES.find((g) => g.espacioId === espacioId && g.estado === 'activa');
    if (!gestion) return throwError(() => new Error('No hay una gestión activa.'));
    return this.calificaciones
      .guardarActividad({ espacioId, gestionId: gestion.id, periodo: periodoDeFecha(gestion, datos.entrega), paraleloId: aula.paraleloId, materiaId: aula.materiaId, criterioId, nombre: tarea.titulo, fecha: datos.entrega, docenteId })
      .pipe(switchMap((actividad) => this.tareasRepo.guardar({ ...tarea, actividadId: actividad.id })));
  }

  // Elimina la tarea y sus entregas (la actividad de la planilla se quita solo si todavía no tiene notas)
  eliminar(tarea: Tarea): Observable<void> {
    return (tarea.actividadId ? this.calificaciones.notasDeActividad(tarea.actividadId) : of([])).pipe(
      switchMap(async (notas) => {
        for (const e of this.entregasRepo.ahora((x) => x.tareaId === tarea.id)) this.entregasRepo.eliminar(e.id);
        const actividad = tarea.actividadId ? this.calificaciones.actividad(tarea.actividadId) : undefined;
        if (actividad && !notas.length && !this.calificaciones.actividadCerrada(actividad.id)) {
          await firstValueFrom(this.calificaciones.eliminarActividad(actividad));
        }
        await firstValueFrom(this.tareasRepo.eliminar(tarea.id));
      })
    );
  }

  // Guarda la revisión: comentario, entrega revisada y nota (en la planilla, si la tarea cuenta para la nota)
  revisar(espacioId: number, tareaId: number, revisiones: RevisionEntrega[]): Observable<number> {
    const tarea = this.tareasRepo.ahora((t) => t.id === tareaId)[0];
    if (!tarea) return throwError(() => new Error('La tarea ya no existe.'));
    const notas$ = tarea.actividadId
      ? this.calificaciones.guardarNotas(espacioId, revisiones.map((r) => ({ actividadId: tarea.actividadId, estudianteId: r.estudianteId, valor: r.nota })))
      : of(0);
    return notas$.pipe(
      map(() => {
        for (const r of revisiones) {
          const previa = this.entregasRepo.ahora((e) => e.tareaId === tareaId && e.estudianteId === r.estudianteId)[0];
          this.entregasRepo.guardar({
            id: previa?.id, tareaId, estudianteId: r.estudianteId, texto: previa?.texto ?? '', archivo: previa?.archivo ?? '',
            entregadaEl: previa?.entregadaEl ?? '', revisada: true, comentario: r.comentario.trim(),
          });
        }
        return revisiones.length;
      })
    );
  }

  // ---------- Estudiante ----------
  tareasDeEstudiante(espacioId: number, estudianteId: number): Observable<TareaDeEstudiante[]> {
    const aulas = new Set(MOCK_AULAS_VIRTUALES.filter((a) => a.espacioId === espacioId && estudiantesDeAula(a).includes(estudianteId)).map((a) => a.id));
    const tareas = this.tareasRepo.ahora((t) => t.espacioId === espacioId && aulas.has(t.aulaId));
    if (!tareas.length) return of([]).pipe(delay(MOCK_DELAY));
    return from(this.infoDe(tareas)).pipe(
      switchMap(async (info) => {
        const lista: TareaDeEstudiante[] = [];
        const notas = info.some((t) => t.actividadId) ? await firstValueFrom(this.calificaciones.notasDeEstudiante(estudianteId)) : [];
        for (const tarea of info) {
          const entrega = this.entregasRepo.ahora((e) => e.tareaId === tarea.id && e.estudianteId === estudianteId)[0] ?? null;
          lista.push({
            tarea,
            entrega: structuredClone(entrega),
            estado: estadoEntrega(tarea, entrega ?? undefined),
            nota: entrega?.revisada && tarea.actividadId ? notas.find((n) => n.actividadId === tarea.actividadId)?.valor ?? null : null,
          });
        }
        return lista.sort((a, b) => a.tarea.entrega.localeCompare(b.tarea.entrega) || a.tarea.hora.localeCompare(b.tarea.hora));
      })
    );
  }

  entregar(tareaId: number, estudianteId: number, texto: string, archivo: string): Observable<Entrega> {
    const tarea = this.tareasRepo.ahora((t) => t.id === tareaId)[0];
    if (!tarea) return throwError(() => new Error('La tarea ya no existe.'));
    if (!texto.trim() && !archivo) return throwError(() => new Error('Escribe un comentario o adjunta un archivo.'));
    const previa = this.entregasRepo.ahora((e) => e.tareaId === tareaId && e.estudianteId === estudianteId)[0];
    if (previa?.revisada) return throwError(() => new Error('El docente ya revisó tu entrega; no se puede modificar.'));
    return this.entregasRepo.guardar({ id: previa?.id, tareaId, estudianteId, texto: texto.trim(), archivo, entregadaEl: ahoraIso(), revisada: false, comentario: '' });
  }

  // ---------- Interno ----------
  // Estudiantes del aula: el paralelo en el colegio, los inscritos activos en un curso de la academia
  private alumnosDe(t: Tarea): Estudiante[] {
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === t.aulaId);
    if (!aula) return [];
    if (aula.tipo === 'clase') return MOCK_ESTUDIANTES.filter((e) => e.paraleloId === aula.paraleloId);
    return estudiantesDeAula(aula)
      .map((id) => ({ id, nombre: MOCK_INSCRIPCIONES.find((i) => i.usuarioId === id)?.usuarioNombre ?? `Estudiante ${id}`, paraleloId: 0, ci: '', fechaNacimiento: '' }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private async infoDe(tareas: Tarea[]): Promise<TareaInfo[]> {
    const lista: TareaInfo[] = [];
    if (!tareas.length) return lista;
    const config = await firstValueFrom(this.calificaciones.config(tareas[0].espacioId)); // todas son del mismo espacio
    for (const t of tareas) {
      const actividad = this.calificaciones.actividad(t.actividadId);
      const criterioId = actividad?.criterioId ?? 0;
      const paralelo = MOCK_PARALELOS.find((p) => p.id === t.paraleloId);
      const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === t.aulaId);
      // En los cursos de la academia no hay materia: el aula hace de materia (nombre, ícono y color)
      const materia = MOCK_MATERIAS.find((m) => m.id === t.materiaId) ?? {
        id: 0, espacioId: t.espacioId, nombre: aula?.nombre ?? 'Curso', nivel: 'secundaria' as const, horasSemanales: 0,
        icono: aula?.icono ?? 'computo', tono: aula?.tono ?? 'lima',
      };
      lista.push({
        ...structuredClone(t),
        materia,
        curso: paralelo ? paraleloLabel(paralelo) : aula?.categoria || 'Curso online',
        docente: MOCK_DOCENTES.find((d) => d.id === t.docenteId)?.nombre ?? '',
        criterio: config.criterios.find((c) => c.id === criterioId)?.nombre ?? '',
        actividadNombre: actividad?.nombre ?? '',
        notaMaxima: config.notaMaxima,
      });
    }
    return lista;
  }
}
