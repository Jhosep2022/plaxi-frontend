import { Asignacion, BloqueHorario, ClaseHorario, ConfigJornada, Paralelo, Turno } from '../models/academico.model';
import { generarBloques, seCruzan } from './jornada';

// Datos necesarios para ubicar clases en el tiempo y detectar choques
export interface ContextoHorario {
  jornada: ConfigJornada;
  paralelos: Paralelo[];
  asignaciones: Asignacion[];
  clases: ClaseHorario[];
}

export type PropuestaClase = Pick<ClaseHorario, 'paraleloId' | 'dia' | 'bloque' | 'materiaId' | 'aulaId'> & { id?: number };

export interface Choque {
  tipo: 'docente' | 'aula';
  docenteId?: number;
  aulaId?: number;
  conParaleloId: number;
  inicio: string;
  fin: string;
}

// Bloques del día de un turno según la jornada (vacío si el turno no está activo)
export function bloquesDelTurno(jornada: ConfigJornada, turno: Turno): BloqueHorario[] {
  const config = jornada.turnos.find((t) => t.turno === turno);
  return config?.activo ? generarBloques(config, jornada.duracionPeriodoMin) : [];
}

// Hora real de un periodo de clase de un paralelo
export function rangoDeBloque(ctx: ContextoHorario, paraleloId: number, bloque: number): { inicio: string; fin: string } | null {
  const paralelo = ctx.paralelos.find((p) => p.id === paraleloId);
  if (!paralelo) return null;
  const encontrado = bloquesDelTurno(ctx.jornada, paralelo.turno).find((b) => b.tipo === 'clase' && b.indice === bloque);
  return encontrado ? { inicio: encontrado.inicio, fin: encontrado.fin } : null;
}

export const docenteDe = (asignaciones: Asignacion[], paraleloId: number, materiaId: number): number =>
  asignaciones.find((a) => a.paraleloId === paraleloId && a.materiaId === materiaId)?.docenteId ?? 0;

// Choques de una clase propuesta con las clases de OTROS paralelos el mismo día a la misma hora:
// el docente no puede estar en dos lugares, ni el aula tener dos clases a la vez.
export function buscarChoques(ctx: ContextoHorario, propuesta: PropuestaClase): Choque[] {
  const rango = rangoDeBloque(ctx, propuesta.paraleloId, propuesta.bloque);
  if (!rango) return [];
  const docente = docenteDe(ctx.asignaciones, propuesta.paraleloId, propuesta.materiaId);
  const choques: Choque[] = [];

  for (const otra of ctx.clases) {
    if (otra.id === propuesta.id || otra.paraleloId === propuesta.paraleloId || otra.dia !== propuesta.dia) continue;
    const otroRango = rangoDeBloque(ctx, otra.paraleloId, otra.bloque);
    if (!otroRango || !seCruzan(rango, otroRango)) continue;

    if (docente && docenteDe(ctx.asignaciones, otra.paraleloId, otra.materiaId) === docente) {
      choques.push({ tipo: 'docente', docenteId: docente, conParaleloId: otra.paraleloId, ...otroRango });
    }
    if (propuesta.aulaId && otra.aulaId === propuesta.aulaId) {
      choques.push({ tipo: 'aula', aulaId: propuesta.aulaId, conParaleloId: otra.paraleloId, ...otroRango });
    }
  }
  return choques;
}

// Clases que quedarían fuera si se aplica una nueva jornada (día o periodo que ya no existe)
export function clasesFueraDeJornada(ctx: ContextoHorario): ClaseHorario[] {
  return ctx.clases.filter((clase) => !ctx.jornada.dias.includes(clase.dia) || !rangoDeBloque(ctx, clase.paraleloId, clase.bloque));
}
