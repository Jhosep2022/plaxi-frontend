import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  Asignacion,
  DIAS_SEMANA,
  Materia,
  Paralelo,
  TURNOS,
  paraleloLabel,
} from '../core/models/academics.model';
import { RegistroAsistencia } from '../core/models/attendance.model';
import { Conteo, contar, dayOfWeek, todayIso, addDays } from '../core/utils/attendance';
import { ResultadoMateria, periodoDeFecha } from '../core/utils/grades';
import { rangoDeBloque } from '../core/utils/schedule';
import { AcademicsService } from './academics.service';
import { AttendanceService } from './attendance.service';
import { ActividadPlanilla, GradesApiService, Planilla } from './grades-api.service';
import { SchedulesService } from './schedules.service';

export interface SesionSemanal {
  dia: number;
  diaLabel: string;
  inicio: string;
  fin: string;
  aula: string;
}

export interface EstudianteDeClase {
  estudiante: { id: number; nombre: string }; // student record
  asistencia: Conteo;
  resultado: ResultadoMateria;
  enRiesgo: boolean; // nota bajo la de aprobación o asistencia bajo el mínimo
}

export interface ClaseDocente {
  asignacion: Asignacion;
  materia: Materia;
  paralelo: Paralelo;
  titulo: string; // "Física · 3ro A"
  turno: string;
  aula: string;
  sesiones: SesionSemanal[];
  proxima: { fecha: string; inicio: string; hoy: boolean } | null;
  config: { notaMaxima: number; notaAprobacion: number };
  periodo: { indice: number; nombre: string; cerrado: boolean };
  estudiantes: EstudianteDeClase[];
  asistencia: Conteo;
  promedio: number | null;
  pendientes: { actividad: ActividadPlanilla; faltan: number }[]; // actividades del periodo con notas sin cargar
  notasPeriodo: { cargadas: number; esperadas: number }; // avance de la carga de notas del periodo
}

export const ASISTENCIA_MINIMA = 85; // % por debajo del cual el estudiante queda en riesgo

// Resumen de las clases (materia + paralelo) de un docente: horario, estudiantes, asistencia y notas.
// Las notas salen de la planilla de la API (el servidor calcula la nota de cada estudiante).
@Injectable({ providedIn: 'root' })
export class TeacherClassesService {
  private horarios = inject(SchedulesService);
  private asistencia = inject(AttendanceService);
  private notas = inject(GradesApiService);
  private academico = inject(AcademicsService);

  clasesDe(espacioId: number, docenteId: number): Observable<ClaseDocente[]> {
    const hoy = todayIso();
    return forkJoin({ horario: this.horarios.getScheduleData(espacioId), gestion: this.academico.getActiveAcademicYear(espacioId) }).pipe(
      switchMap(({ horario, gestion }) => {
        const asignaciones = horario.asignaciones.filter(
          (a) => a.docenteId === (horario.currentTeacherId ?? docenteId),
        );
        if (!asignaciones.length || !gestion) return of([]);
        const indice = periodoDeFecha(gestion, hoy);
        return forkJoin({
          registros: this.asistencia.getRecordsBetween(espacioId, '2000-01-01', hoy),
          planillas: forkJoin(
            asignaciones.map((a) =>
              this.notas.sheet(a.paraleloId, a.materiaId, indice).pipe(catchError(() => of(null))),
            ),
          ),
        }).pipe(
          map(({ registros, planillas }) =>
            asignaciones.flatMap((asignacion, i): ClaseDocente[] => {
              const planilla = planillas[i];
              const paralelo = horario.paralelos.find((p) => p.id === asignacion.paraleloId);
              const materia = horario.materias.find((m) => m.id === asignacion.materiaId);
              if (!planilla || !paralelo || !materia) return [];
              const nombreAula = (id: number) =>
                horario.aulas.find((a) => a.id === id)?.nombre ?? 'Sin aula';
              const sesiones = horario.clases
                .filter((c) => c.paraleloId === asignacion.paraleloId && c.materiaId === asignacion.materiaId)
                .flatMap((c) => {
                  const rango = rangoDeBloque(horario, c.paraleloId, c.bloque);
                  return rango
                    ? [{ dia: c.dia, diaLabel: DIAS_SEMANA.find((x) => x.id === c.dia)?.largo ?? '', ...rango, aula: nombreAula(c.aulaId) }]
                    : [];
                })
                .sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio));
              const propios = registros.filter(
                (r) => r.paraleloId === asignacion.paraleloId && r.materiaId === asignacion.materiaId,
              );
              return [
                armar(asignacion, materia, paralelo, planilla, sesiones, propios, nombreAula(paralelo.aulaId), {
                  indice,
                  nombre: gestion.periodos[indice]?.nombre ?? '',
                }),
              ];
            }),
          ),
        );
      }),
      map((clases) =>
        clases.sort(
          (a, b) =>
            (a.proxima?.fecha ?? '9').localeCompare(b.proxima?.fecha ?? '9') ||
            (a.proxima?.inicio ?? '').localeCompare(b.proxima?.inicio ?? ''),
        ),
      ),
    );
  }
}

function armar(
  asignacion: Asignacion,
  materia: Materia,
  paralelo: Paralelo,
  planilla: Planilla,
  sesiones: SesionSemanal[],
  registros: RegistroAsistencia[],
  aula: string,
  periodo: { indice: number; nombre: string },
): ClaseDocente {
  const config = { notaMaxima: planilla.config.notaMaxima, notaAprobacion: planilla.config.notaAprobacion };
  const estudiantes = planilla.estudiantes.map((fila) => {
    const asistencia = contar(registros.filter((r) => r.estudianteId === fila.id));
    const reprobando = fila.resultado.final !== null && fila.resultado.final < config.notaAprobacion;
    return {
      estudiante: { id: fila.id, nombre: fila.nombre },
      asistencia,
      resultado: fila.resultado,
      enRiesgo: reprobando || (asistencia.total > 0 && asistencia.porcentaje < ASISTENCIA_MINIMA),
    };
  });
  const tieneNota = (actividadId: number, fila: Planilla['estudiantes'][number]) =>
    fila.notas[actividadId] !== null && fila.notas[actividadId] !== undefined;
  const finales = estudiantes.map((e) => e.resultado.final).filter((f): f is number => f !== null);
  return {
    asignacion,
    materia,
    paralelo,
    titulo: `${materia.nombre} · ${paraleloLabel(paralelo)}`,
    turno: TURNOS.find((t) => t.id === paralelo.turno)?.label ?? '',
    aula,
    sesiones,
    proxima: proximaSesion(sesiones, todayIso()),
    config,
    periodo: { ...periodo, cerrado: planilla.cerrado },
    estudiantes,
    asistencia: contar(registros),
    promedio: finales.length ? Math.round(finales.reduce((s, f) => s + f, 0) / finales.length) : null,
    pendientes: planilla.actividades
      .map((actividad) => ({ actividad, faltan: planilla.estudiantes.filter((e) => !tieneNota(actividad.id, e)).length }))
      .filter((p) => p.faltan > 0),
    notasPeriodo: {
      esperadas: planilla.actividades.length * planilla.estudiantes.length,
      cargadas: planilla.actividades.reduce((s, a) => s + planilla.estudiantes.filter((e) => tieneNota(a.id, e)).length, 0),
    },
  };
}

// Próxima sesión desde ahora (hoy si todavía no empezó, o en los próximos 7 días)
function proximaSesion(
  sesiones: SesionSemanal[],
  hoy: string,
): ClaseDocente['proxima'] {
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  for (let i = 0; i < 7; i++) {
    const fecha = addDays(hoy, i);
    const sesion = sesiones.find(
      (s) => s.dia === dayOfWeek(fecha) && (i > 0 || s.fin > hora),
    );
    if (sesion) return { fecha, inicio: sesion.inicio, hoy: i === 0 };
  }
  return null;
}
