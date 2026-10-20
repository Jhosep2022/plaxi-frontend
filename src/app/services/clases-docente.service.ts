import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Asignacion, DIAS_SEMANA, Materia, Paralelo, TURNOS, paraleloLabel } from '../core/models/academico.model';
import { Estudiante, RegistroAsistencia } from '../core/models/asistencia.model';
import { Actividad, ConfigCalificacion } from '../core/models/calificaciones.model';
import { Conteo, contar, diaDeSemana, hoyIso, sumarDias } from '../core/utils/asistencia';
import { ResultadoMateria, aprobado, calcularNota, indiceNotas, periodoDeFecha } from '../core/utils/calificaciones';
import { rangoDeBloque } from '../core/utils/horario';
import { AsistenciaService } from './asistencia.service';
import { CalificacionesService, DatosParalelo } from './calificaciones.service';
import { HorariosService } from './horarios.service';

export interface SesionSemanal {
  dia: number;
  diaLabel: string;
  inicio: string;
  fin: string;
  aula: string;
}

export interface EstudianteDeClase {
  estudiante: Estudiante;
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
  config: ConfigCalificacion;
  periodo: { indice: number; nombre: string; cerrado: boolean };
  estudiantes: EstudianteDeClase[];
  asistencia: Conteo;
  promedio: number | null;
  pendientes: { actividad: Actividad; faltan: number }[]; // actividades del periodo con notas sin cargar
  notasPeriodo: { cargadas: number; esperadas: number }; // avance de la carga de notas del periodo
}

export const ASISTENCIA_MINIMA = 85; // % por debajo del cual el estudiante queda en riesgo

// Resumen de las clases (materia + paralelo) de un docente: horario, estudiantes, asistencia y notas.
// Junta datos de horarios, asistencia y calificaciones; con backend sería un solo endpoint.
@Injectable({ providedIn: 'root' })
export class ClasesDocenteService {
  private horarios = inject(HorariosService);
  private asistencia = inject(AsistenciaService);
  private calificaciones = inject(CalificacionesService);

  clasesDe(espacioId: number, docenteId: number): Observable<ClaseDocente[]> {
    const hoy = hoyIso();
    return this.horarios.datos(espacioId).pipe(
      switchMap((horario) => {
        const asignaciones = horario.asignaciones.filter((a) => a.docenteId === docenteId);
        const paralelos = [...new Set(asignaciones.map((a) => a.paraleloId))];
        if (!paralelos.length) return of([]);
        return forkJoin({
          registros: this.asistencia.registrosEntre(espacioId, '2000-01-01', hoy),
          datos: forkJoin(paralelos.map((id) => this.calificaciones.datosDeParalelo(espacioId, id))),
        }).pipe(
          map(({ registros, datos }) =>
            asignaciones.flatMap((asignacion): ClaseDocente[] => {
              const d = datos.find((x) => x?.paralelo.id === asignacion.paraleloId);
              const materia = horario.materias.find((m) => m.id === asignacion.materiaId);
              if (!d || !materia) return [];
              const nombreAula = (id: number) => horario.aulas.find((a) => a.id === id)?.nombre ?? 'Sin aula';
              const sesiones = horario.clases
                .filter((c) => c.paraleloId === asignacion.paraleloId && c.materiaId === asignacion.materiaId)
                .flatMap((c) => {
                  const rango = rangoDeBloque(horario, c.paraleloId, c.bloque);
                  return rango ? [{ dia: c.dia, diaLabel: DIAS_SEMANA.find((x) => x.id === c.dia)?.largo ?? '', ...rango, aula: nombreAula(c.aulaId) }] : [];
                })
                .sort((a, b) => a.dia - b.dia || a.inicio.localeCompare(b.inicio));
              const propios = registros.filter((r) => r.paraleloId === asignacion.paraleloId && r.materiaId === asignacion.materiaId);
              return [this.armar(asignacion, materia, d, sesiones, propios, nombreAula(d.paralelo.aulaId), hoy)];
            })
          )
        );
      }),
      map((clases) => clases.sort((a, b) => (a.proxima?.fecha ?? '9').localeCompare(b.proxima?.fecha ?? '9') || (a.proxima?.inicio ?? '').localeCompare(b.proxima?.inicio ?? '')))
    );
  }

  private armar(asignacion: Asignacion, materia: Materia, d: DatosParalelo, sesiones: SesionSemanal[], registros: RegistroAsistencia[], aula: string, hoy: string): ClaseDocente {
    const indice = periodoDeFecha(d.gestion, hoy);
    const actividades = d.actividades.filter((a) => a.materiaId === materia.id && a.periodo === indice);
    const buscar = indiceNotas(d.notas);
    const estudiantes = d.estudiantes.map((estudiante) => {
      const asistencia = contar(registros.filter((r) => r.estudianteId === estudiante.id));
      const resultado = calcularNota(d.config.criterios, actividades, buscar, estudiante.id);
      const reprobando = resultado.final !== null && !aprobado(d.config, resultado.final);
      return { estudiante, asistencia, resultado, enRiesgo: reprobando || (asistencia.total > 0 && asistencia.porcentaje < ASISTENCIA_MINIMA) };
    });
    const finales = estudiantes.map((e) => e.resultado.final).filter((f): f is number => f !== null);
    return {
      asignacion,
      materia,
      paralelo: d.paralelo,
      titulo: `${materia.nombre} · ${paraleloLabel(d.paralelo)}`,
      turno: TURNOS.find((t) => t.id === d.paralelo.turno)?.label ?? '',
      aula,
      sesiones,
      proxima: proximaSesion(sesiones, hoy),
      config: d.config,
      periodo: { indice, nombre: d.gestion.periodos[indice]?.nombre ?? '', cerrado: d.cierres.some((c) => c.periodo === indice) },
      estudiantes,
      asistencia: contar(registros),
      promedio: finales.length ? Math.round(finales.reduce((s, f) => s + f, 0) / finales.length) : null,
      pendientes: actividades
        .map((actividad) => ({ actividad, faltan: d.estudiantes.filter((e) => buscar(actividad.id, e.id) === undefined).length }))
        .filter((p) => p.faltan > 0),
      notasPeriodo: {
        esperadas: actividades.length * d.estudiantes.length,
        cargadas: actividades.reduce((s, a) => s + d.estudiantes.filter((e) => buscar(a.id, e.id) !== undefined).length, 0),
      },
    };
  }
}

// Próxima sesión desde ahora (hoy si todavía no empezó, o en los próximos 7 días)
function proximaSesion(sesiones: SesionSemanal[], hoy: string): ClaseDocente['proxima'] {
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(hoy, i);
    const sesion = sesiones.find((s) => s.dia === diaDeSemana(fecha) && (i > 0 || s.fin > hora));
    if (sesion) return { fecha, inicio: sesion.inicio, hoy: i === 0 };
  }
  return null;
}
