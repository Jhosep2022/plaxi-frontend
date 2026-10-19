import { Asignacion, Docente, Gestion, Materia } from '../models/academico.model';
import { Actividad, ConfigCalificacion, Criterio, Nota } from '../models/calificaciones.model';

// Busca la nota de un estudiante en una actividad
export type BuscarNota = (actividadId: number, estudianteId: number) => number | undefined;

export function indiceNotas(notas: Nota[]): BuscarNota {
  const mapa = new Map(notas.map((n) => [`${n.actividadId}-${n.estudianteId}`, n.valor]));
  return (actividadId, estudianteId) => mapa.get(`${actividadId}-${estudianteId}`);
}

export interface ResultadoCriterio {
  criterio: Criterio;
  promedio: number | null; // null = todavía sin notas en ese criterio
  actividades: number;
}

export interface ResultadoMateria {
  porCriterio: ResultadoCriterio[];
  final: number | null;
  completo: boolean; // todos los criterios tienen al menos una nota
}

// Nota de una materia en un periodo:
// promedio de las actividades calificadas de cada criterio y luego promedio ponderado por criterio.
// Si un criterio aún no tiene notas, se reparte su peso entre los demás (nota parcial).
export function calcularNota(criterios: Criterio[], actividades: Actividad[], nota: BuscarNota, estudianteId: number): ResultadoMateria {
  const porCriterio = criterios.map((criterio) => {
    const propias = actividades.filter((a) => a.criterioId === criterio.id);
    const valores = propias.map((a) => nota(a.id, estudianteId)).filter((v): v is number => v !== undefined);
    return {
      criterio,
      actividades: propias.length,
      promedio: valores.length ? redondear(valores.reduce((s, v) => s + v, 0) / valores.length) : null,
    };
  });
  const conNota = porCriterio.filter((c) => c.promedio !== null);
  const peso = conNota.reduce((s, c) => s + c.criterio.porcentaje, 0);
  const final = peso > 0 ? Math.round(conNota.reduce((s, c) => s + c.promedio! * c.criterio.porcentaje, 0) / peso) : null;
  return { porCriterio, final, completo: conNota.length === criterios.length };
}

export const redondear = (n: number): number => Math.round(n * 10) / 10;

export const aprobado = (config: Pick<ConfigCalificacion, 'notaAprobacion'>, nota: number): boolean => nota >= config.notaAprobacion;

// Promedio de las notas que existan (null si no hay ninguna)
export function promedio(notas: (number | null)[]): number | null {
  const valores = notas.filter((n): n is number => n !== null);
  return valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
}

// Periodo en curso para una fecha: el que la contiene, o el último que ya empezó
export function periodoDeFecha(gestion: Pick<Gestion, 'periodos'>, fecha: string): number {
  let actual = 0;
  gestion.periodos.forEach((p, i) => {
    if (p.inicio <= fecha) actual = i;
  });
  return actual;
}

export interface FilaBoletin {
  materia: Materia;
  docente: string;
  periodos: (number | null)[]; // nota final de cada periodo (null = sin notas todavía)
  anual: number | null;
}

// Boletín de un estudiante: nota de cada materia en cada periodo y su promedio anual
export function boletinDe(
  d: { config: ConfigCalificacion; gestion: Pick<Gestion, 'periodos'>; materias: Materia[]; asignaciones: Asignacion[]; docentes: Docente[]; actividades: Actividad[] },
  nota: BuscarNota,
  estudianteId: number
): FilaBoletin[] {
  return d.materias.map((materia) => {
    const docenteId = d.asignaciones.find((a) => a.materiaId === materia.id)?.docenteId;
    const periodos = d.gestion.periodos.map((_, i) =>
      calcularNota(d.config.criterios, d.actividades.filter((a) => a.materiaId === materia.id && a.periodo === i), nota, estudianteId).final
    );
    return { materia, docente: d.docentes.find((x) => x.id === docenteId)?.nombre ?? 'Sin docente', periodos, anual: promedio(periodos) };
  });
}
