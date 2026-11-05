import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';
import { Materia, paraleloLabel } from '../core/models/academics.model';
import { Estudiante } from '../core/models/attendance.model';
import type { Entrega, EstadoEntrega, Tarea } from '../core/models/assignments.model';
import { todayIso } from '../core/utils/attendance';
import { periodoDeFecha } from '../core/utils/grades';
import { currentDateTimeIso, getSubmissionStatus } from '../core/utils/assignments';
import { MOCK_DOCENTES, MOCK_GESTIONES, MOCK_MATERIAS, MOCK_PARALELOS } from '../mocks/academics.mock';
import { MOCK_ESTUDIANTES } from '../mocks/attendance.mock';
import { MOCK_AULAS_VIRTUALES, estudiantesDeAula } from '../mocks/classrooms.mock';
import { MOCK_DELAY, MOCK_INSCRIPCIONES } from '../mocks/mock-data';
import { MOCK_ENTREGAS, MOCK_TAREAS } from '../mocks/assignments.mock';
import { GradesService } from './grades.service';
import { MockRepository } from './mock-repository';

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
export class AssignmentsService {
  private calificaciones = inject(GradesService);
  private tareasRepo = new MockRepository<Tarea>(MOCK_TAREAS);
  private entregasRepo = new MockRepository<Entrega>(MOCK_ENTREGAS);

  // ---------- Docente ----------
  tareasDocente(espacioId: number, docenteId: number): Observable<TareaDocente[]> {
    return from(this.infoDe(this.tareasRepo.readNow((t) => t.espacioId === espacioId && t.docenteId === docenteId))).pipe(
      map((tareas) =>
        tareas.map((t) => {
          const alumnos = this.alumnosDe(t);
          const entregas = this.entregasRepo.readNow((e) => e.tareaId === t.id);
          const estados = alumnos.map((a) => getSubmissionStatus(t, entregas.find((e) => e.estudianteId === a.id)));
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
    const t = this.tareasRepo.readNow((x) => x.id === tareaId)[0];
    if (!t) return of(null).pipe(delay(MOCK_DELAY));
    return from(this.infoDe([t])).pipe(
      switchMap(([tarea]) =>
        (t.actividadId ? this.calificaciones.getActivityGrades(t.actividadId) : of([])).pipe(
          map((notas) => ({
            tarea,
            cerrado: !!t.actividadId && this.calificaciones.isActivityClosed(t.actividadId),
            filas: this.alumnosDe(t).map((estudiante) => {
              const entrega = this.entregasRepo.readNow((e) => e.tareaId === t.id && e.estudianteId === estudiante.id)[0] ?? null;
              return {
                estudiante: structuredClone(estudiante),
                entrega: structuredClone(entrega),
                estado: getSubmissionStatus(t, entrega ?? undefined),
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
    if (datos.entrega < todayIso()) return throwError(() => new Error('La fecha de entrega no puede ser anterior a hoy.'));
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === datos.aulaId && a.espacioId === espacioId);
    if (!aula) return throwError(() => new Error('Elige una de tus clases.'));
    const tarea = {
      ...datos, paraleloId: aula.paraleloId, materiaId: aula.materiaId, titulo: datos.titulo.trim(), instrucciones: datos.instrucciones.trim(),
      espacioId, docenteId, asignada: todayIso(), actividadId: 0,
    };
    if (!criterioId || aula.tipo !== 'clase') return this.tareasRepo.save(tarea);
    const gestion = MOCK_GESTIONES.find((g) => g.espacioId === espacioId && g.estado === 'activa');
    if (!gestion) return throwError(() => new Error('No hay una gestión activa.'));
    return this.calificaciones
      .saveActivity({ espacioId, gestionId: gestion.id, periodo: periodoDeFecha(gestion, datos.entrega), paraleloId: aula.paraleloId, materiaId: aula.materiaId, criterioId, nombre: tarea.titulo, fecha: datos.entrega, docenteId })
      .pipe(switchMap((actividad) => this.tareasRepo.save({ ...tarea, actividadId: actividad.id })));
  }

  // Elimina la tarea y sus entregas (la actividad de la planilla se quita solo si todavía no tiene notas)
  eliminar(tarea: Tarea): Observable<void> {
    return (tarea.actividadId ? this.calificaciones.getActivityGrades(tarea.actividadId) : of([])).pipe(
      switchMap(async (notas) => {
        for (const e of this.entregasRepo.readNow((x) => x.tareaId === tarea.id)) this.entregasRepo.delete(e.id);
        const actividad = tarea.actividadId ? this.calificaciones.getActivity(tarea.actividadId) : undefined;
        if (actividad && !notas.length && !this.calificaciones.isActivityClosed(actividad.id)) {
          await firstValueFrom(this.calificaciones.deleteActivity(actividad));
        }
        await firstValueFrom(this.tareasRepo.delete(tarea.id));
      })
    );
  }

  // Guarda la revisión: comentario, entrega revisada y nota (en la planilla, si la tarea cuenta para la nota)
  revisar(espacioId: number, tareaId: number, revisiones: RevisionEntrega[]): Observable<number> {
    const tarea = this.tareasRepo.readNow((t) => t.id === tareaId)[0];
    if (!tarea) return throwError(() => new Error('La tarea ya no existe.'));
    const notas$ = tarea.actividadId
      ? this.calificaciones.saveGrades(espacioId, revisiones.map((r) => ({ actividadId: tarea.actividadId, estudianteId: r.estudianteId, valor: r.nota })))
      : of(0);
    return notas$.pipe(
      map(() => {
        for (const r of revisiones) {
          const previa = this.entregasRepo.readNow((e) => e.tareaId === tareaId && e.estudianteId === r.estudianteId)[0];
          this.entregasRepo.save({
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
    const tareas = this.tareasRepo.readNow((t) => t.espacioId === espacioId && aulas.has(t.aulaId));
    if (!tareas.length) return of([]).pipe(delay(MOCK_DELAY));
    return from(this.infoDe(tareas)).pipe(
      switchMap(async (info) => {
        const lista: TareaDeEstudiante[] = [];
        const notas = info.some((t) => t.actividadId) ? await firstValueFrom(this.calificaciones.getStudentGrades(estudianteId)) : [];
        for (const tarea of info) {
          const entrega = this.entregasRepo.readNow((e) => e.tareaId === tarea.id && e.estudianteId === estudianteId)[0] ?? null;
          lista.push({
            tarea,
            entrega: structuredClone(entrega),
            estado: getSubmissionStatus(tarea, entrega ?? undefined),
            nota: entrega?.revisada && tarea.actividadId ? notas.find((n) => n.actividadId === tarea.actividadId)?.valor ?? null : null,
          });
        }
        return lista.sort((a, b) => a.tarea.entrega.localeCompare(b.tarea.entrega) || a.tarea.hora.localeCompare(b.tarea.hora));
      })
    );
  }

  entregar(tareaId: number, estudianteId: number, texto: string, archivo: string): Observable<Entrega> {
    const tarea = this.tareasRepo.readNow((t) => t.id === tareaId)[0];
    if (!tarea) return throwError(() => new Error('La tarea ya no existe.'));
    if (!texto.trim() && !archivo) return throwError(() => new Error('Escribe un comentario o adjunta un archivo.'));
    const previa = this.entregasRepo.readNow((e) => e.tareaId === tareaId && e.estudianteId === estudianteId)[0];
    if (previa?.revisada) return throwError(() => new Error('El docente ya revisó tu entrega; no se puede modificar.'));
    return this.entregasRepo.save({ id: previa?.id, tareaId, estudianteId, texto: texto.trim(), archivo, entregadaEl: currentDateTimeIso(), revisada: false, comentario: '' });
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
    const config = await firstValueFrom(this.calificaciones.getConfig(tareas[0].espacioId)); // todas son del mismo espacio
    for (const t of tareas) {
      const actividad = this.calificaciones.getActivity(t.actividadId);
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
