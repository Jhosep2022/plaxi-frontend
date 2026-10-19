import { TipoEspacio } from './espacio.model';

// ---------- Escala y ponderación (editable por cada espacio) ----------
export interface Criterio {
  id: number;
  nombre: string;
  porcentaje: number; // peso dentro de la nota final; la suma de todos es 100
}

export interface ConfigCalificacion {
  id: number; // = espacioId
  notaMaxima: number;
  notaAprobacion: number;
  criterios: Criterio[];
}

// Colegio: dimensiones del modelo educativo (Ser, Saber, Hacer, Decidir)
export const CRITERIOS_COLEGIO: Criterio[] = [
  { id: 1, nombre: 'Ser', porcentaje: 10 },
  { id: 2, nombre: 'Saber', porcentaje: 45 },
  { id: 3, nombre: 'Hacer', porcentaje: 40 },
  { id: 4, nombre: 'Decidir', porcentaje: 5 },
];

// Academia: evaluación clásica por tipo de actividad
export const CRITERIOS_ACADEMIA: Criterio[] = [
  { id: 1, nombre: 'Exámenes', porcentaje: 40 },
  { id: 2, nombre: 'Prácticas', porcentaje: 35 },
  { id: 3, nombre: 'Tareas', porcentaje: 25 },
];

export function configPorDefecto(espacioId: number, tipo: TipoEspacio): ConfigCalificacion {
  return {
    id: espacioId,
    notaMaxima: 100,
    notaAprobacion: 51,
    criterios: structuredClone(tipo === 'colegio' ? CRITERIOS_COLEGIO : CRITERIOS_ACADEMIA),
  };
}

// ---------- Actividades y notas ----------
// Actividad evaluada (examen, práctica…) de una materia en un paralelo, dentro de un periodo
export interface Actividad {
  id: number;
  espacioId: number;
  gestionId: number;
  periodo: number; // índice del periodo dentro de la gestión (0 = 1er trimestre)
  paraleloId: number;
  materiaId: number;
  criterioId: number;
  nombre: string;
  fecha: string; // YYYY-MM-DD
  docenteId: number;
}

// Nota de un estudiante en una actividad (si no existe, la actividad aún no fue calificada)
export interface Nota {
  id: number;
  actividadId: number;
  estudianteId: number;
  valor: number;
}

// ---------- Cierre de periodos ----------
// Un periodo cerrado bloquea las notas: el docente ya no puede editarlas
export interface CierrePeriodo {
  id: number;
  espacioId: number;
  gestionId: number;
  periodo: number;
  cerradoEl: string; // YYYY-MM-DD
}
