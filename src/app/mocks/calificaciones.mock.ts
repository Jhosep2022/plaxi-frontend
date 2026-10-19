// ============================================================================
// DATOS MOCKEADOS del módulo Calificaciones (Colegio San José, gestión 2026)
// Se generan de forma determinística: siempre son los mismos al recargar.
// ============================================================================
import { Actividad, CierrePeriodo, ConfigCalificacion, Nota, configPorDefecto } from '../core/models/calificaciones.model';
import { sumarDias } from '../core/utils/asistencia';
import { MOCK_ASIGNACIONES, MOCK_GESTIONES } from './academico.mock';
import { MOCK_ESTUDIANTES } from './asistencia.mock';

const E = 1;
const HOY_MOCK = '2026-10-19'; // las actividades del periodo en curso llegan hasta esta fecha

export const MOCK_CONFIG_CALIFICACIONES: ConfigCalificacion[] = [configPorDefecto(1, 'colegio'), configPorDefecto(2, 'academia')];

// 1er y 2do trimestre cerrados; el 3ro está en curso
export const MOCK_CIERRES: CierrePeriodo[] = [
  { id: 1, espacioId: E, gestionId: 2, periodo: 0, cerradoEl: '2026-05-22' },
  { id: 2, espacioId: E, gestionId: 2, periodo: 1, cerradoEl: '2026-09-04' },
];

// Plan de actividades de cada trimestre: criterio (1 Ser, 2 Saber, 3 Hacer, 4 Decidir) y días desde el inicio
const PLAN: { criterioId: number; nombre: string; dias: number }[] = [
  { criterioId: 3, nombre: 'Práctica 1', dias: 14 },
  { criterioId: 2, nombre: 'Examen parcial', dias: 30 },
  { criterioId: 3, nombre: 'Práctica 2', dias: 40 },
  { criterioId: 3, nombre: 'Proyecto', dias: 75 },
  { criterioId: 2, nombre: 'Examen trimestral', dias: 88 },
  { criterioId: 1, nombre: 'Responsabilidad y respeto', dias: 92 },
  { criterioId: 4, nombre: 'Autoevaluación', dias: 93 },
];

const gestion = MOCK_GESTIONES.find((g) => g.id === 2)!;

let idActividad = 0;
export const MOCK_ACTIVIDADES: Actividad[] = MOCK_ASIGNACIONES.flatMap((asig) =>
  gestion.periodos.flatMap((periodo, indice) => {
    const actividades = PLAN.map((p) => ({ ...p, fecha: sumarDias(periodo.inicio, p.dias) })).filter((p) => p.fecha <= HOY_MOCK);
    // María (docente 3) ya tomó la Práctica 3 del periodo en curso pero todavía no cargó las notas
    if (indice === 2 && asig.docenteId === 3) actividades.push({ criterioId: 3, nombre: 'Práctica 3', dias: 0, fecha: '2026-10-16' });
    return actividades.map((p) => ({
      id: ++idActividad,
      espacioId: E,
      gestionId: 2,
      periodo: indice,
      paraleloId: asig.paraleloId,
      materiaId: asig.materiaId,
      criterioId: p.criterioId,
      nombre: p.nombre,
      fecha: p.fecha,
      docenteId: asig.docenteId,
    }));
  })
);

// Pseudoaleatorio determinístico en [0, 1) a partir de un texto
function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// Nivel esperado de un estudiante en una materia y periodo.
// Historia de Luis (id 2): buen estudiante que reprobó Física en el 2do trimestre y se está recuperando.
function nivel(estudianteId: number, materiaId: number, periodo: number): number {
  if (estudianteId === 2) return materiaId === 8 ? [70, 44, 62][periodo] : 84;
  return 50 + azar(`base-${estudianteId}`) * 45 + (azar(`materia-${estudianteId}-${materiaId}`) - 0.5) * 16;
}

let idNota = 0;
export const MOCK_NOTAS: Nota[] = MOCK_ACTIVIDADES.filter((a) => a.nombre !== 'Práctica 3').flatMap((act) =>
  MOCK_ESTUDIANTES.filter((e) => e.paraleloId === act.paraleloId).map((est) => {
    const ruido = (azar(`${act.id}-${est.id}`) - 0.5) * (est.id === 2 ? 10 : 16);
    return { id: ++idNota, actividadId: act.id, estudianteId: est.id, valor: Math.max(10, Math.min(100, Math.round(nivel(est.id, act.materiaId, act.periodo) + ruido))) };
  })
);
