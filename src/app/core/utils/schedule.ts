import {
  Asignacion,
  Aula,
  BloqueHorario,
  ClaseHorario,
  ConfigJornada,
  Docente,
  IconoMateria,
  Materia,
  Paralelo,
  Turno,
  paraleloLabel as etiquetaParalelo,
} from '../models/academico.model';
import { Tono } from '../../shared/dashboard/dashboard.models';
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

// ---------- Vistas de solo lectura (por docente, por aula, Mi horario) ----------

// Todo lo necesario para mostrar horarios con nombres
export interface DatosHorario extends ContextoHorario {
  materias: Materia[];
  docentes: Docente[];
  aulas: Aula[];
}

export interface FilaVista {
  tipo: 'clase' | 'recreo';
  inicio: string;
  fin: string;
}

export interface ItemVista {
  dia: number;
  inicio: string;
  fin: string;
  titulo: string;
  detalle: string[];
  icono: IconoMateria;
  tono: Tono;
  paraleloId: number;
}

// Qué se destaca en cada vista: en la del docente importa el paralelo; en la del estudiante, el docente
export type ModoVista = 'paralelo' | 'docente' | 'aula';

// Filas de la grilla: los periodos y recreos de los turnos involucrados, sin repetir y en orden
export function filasParaTurnos(jornada: ConfigJornada, turnos: Turno[]): FilaVista[] {
  const mapa = new Map<string, FilaVista>();
  for (const turno of new Set(turnos)) {
    for (const b of bloquesDelTurno(jornada, turno)) mapa.set(`${b.inicio}-${b.fin}`, { tipo: b.tipo, inicio: b.inicio, fin: b.fin });
  }
  return [...mapa.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// Convierte clases en celdas con nombres legibles según la vista
export function itemsDeClases(datos: DatosHorario, clases: ClaseHorario[], modo: ModoVista): ItemVista[] {
  const materia = new Map(datos.materias.map((m) => [m.id, m]));
  const docente = new Map(datos.docentes.map((d) => [d.id, d.nombre]));
  const aula = new Map(datos.aulas.map((a) => [a.id, a.nombre]));
  const paralelo = new Map(datos.paralelos.map((p) => [p.id, p]));

  return clases.flatMap((clase) => {
    const rango = rangoDeBloque(datos, clase.paraleloId, clase.bloque);
    const m = materia.get(clase.materiaId);
    const p = paralelo.get(clase.paraleloId);
    if (!rango || !p) return [];
    const nombreMateria = m?.nombre ?? 'Materia';
    const nombreDocente = docente.get(docenteDe(datos.asignaciones, clase.paraleloId, clase.materiaId)) ?? 'Sin docente';
    const nombreAula = aula.get(clase.aulaId) ?? 'Sin aula';
    const detalle =
      modo === 'docente' ? [etiquetaParalelo(p), nombreAula]
      : modo === 'aula' ? [etiquetaParalelo(p), nombreDocente]
      : [nombreDocente, nombreAula];
    return [{ dia: clase.dia, ...rango, titulo: nombreMateria, detalle, icono: m?.icono ?? 'libro', tono: m?.tono ?? 'azul', paraleloId: p.id }];
  });
}

// Turnos de los paralelos de un conjunto de clases (para saber qué filas mostrar)
export function turnosDeClases(datos: DatosHorario, clases: ClaseHorario[]): Turno[] {
  const turnos = clases.map((c) => datos.paralelos.find((p) => p.id === c.paraleloId)?.turno).filter((t): t is Turno => !!t);
  return [...new Set(turnos)];
}

// Clases de un docente según sus asignaciones
export function clasesDeDocente(datos: DatosHorario, docenteId: number): ClaseHorario[] {
  return datos.clases.filter((c) => docenteDe(datos.asignaciones, c.paraleloId, c.materiaId) === docenteId);
}
