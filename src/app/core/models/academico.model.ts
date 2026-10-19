import { Tono } from '../../shared/dashboard/dashboard.models';

// ---------- Niveles y grados ----------
export type Nivel = 'inicial' | 'primaria' | 'secundaria';

export const NIVELES: { id: Nivel; label: string; grados: number }[] = [
  { id: 'inicial', label: 'Inicial', grados: 2 },
  { id: 'primaria', label: 'Primaria', grados: 6 },
  { id: 'secundaria', label: 'Secundaria', grados: 6 },
];

const ORDINAL = ['', '1ro', '2do', '3ro', '4to', '5to', '6to'];
const ORDINAL_INICIAL = ['', '1ra sección', '2da sección'];

// "3ro" (primaria/secundaria) o "2da sección" (inicial)
export function gradoLabel(nivel: Nivel, grado: number): string {
  return nivel === 'inicial' ? ORDINAL_INICIAL[grado] ?? `${grado}°` : ORDINAL[grado] ?? `${grado}°`;
}

// ---------- Gestión y periodos ----------
export type TipoPeriodo = 'trimestre' | 'bimestre' | 'semestre';
export type EstadoGestion = 'planificada' | 'activa' | 'cerrada';

export const TIPOS_PERIODO: { id: TipoPeriodo; label: string; cantidad: number; nombre: (n: number) => string }[] = [
  { id: 'trimestre', label: 'Trimestral', cantidad: 3, nombre: (n) => `${['1er', '2do', '3er'][n - 1]} Trimestre` },
  { id: 'bimestre', label: 'Bimestral', cantidad: 4, nombre: (n) => `${['1er', '2do', '3er', '4to'][n - 1]} Bimestre` },
  { id: 'semestre', label: 'Semestral', cantidad: 2, nombre: (n) => `${['1er', '2do'][n - 1]} Semestre` },
];

export interface Periodo {
  nombre: string;
  inicio: string; // YYYY-MM-DD
  fin: string;
}

export interface Gestion {
  id: number;
  espacioId: number;
  anio: number;
  tipoPeriodo: TipoPeriodo;
  estado: EstadoGestion;
  periodos: Periodo[];
}

// ---------- Aulas ----------
export type TipoAula = 'aula' | 'laboratorio' | 'computacion' | 'deportes' | 'biblioteca' | 'otro';

export const TIPOS_AULA: { id: TipoAula; label: string }[] = [
  { id: 'aula', label: 'Aula' },
  { id: 'laboratorio', label: 'Laboratorio' },
  { id: 'computacion', label: 'Sala de computación' },
  { id: 'deportes', label: 'Espacio deportivo' },
  { id: 'biblioteca', label: 'Biblioteca' },
  { id: 'otro', label: 'Otro' },
];

export interface Aula {
  id: number;
  espacioId: number;
  nombre: string;
  tipo: TipoAula;
  capacidad: number;
  ubicacion: string;
  activa: boolean;
}

// ---------- Paralelos ----------
export type Turno = 'manana' | 'tarde' | 'noche';

export const TURNOS: { id: Turno; label: string }[] = [
  { id: 'manana', label: 'Mañana' },
  { id: 'tarde', label: 'Tarde' },
  { id: 'noche', label: 'Noche' },
];

export interface Paralelo {
  id: number;
  espacioId: number;
  gestionId: number;
  nivel: Nivel;
  grado: number;
  letra: string;
  turno: Turno;
  aulaId: number; // 0 = sin aula fija
  capacidad: number;
  estudiantes: number;
}

export function paraleloLabel(p: Pick<Paralelo, 'nivel' | 'grado' | 'letra'>): string {
  return `${gradoLabel(p.nivel, p.grado)} ${p.letra}`;
}

// ---------- Materias ----------
export type IconoMateria =
  | 'calculadora' | 'atomo' | 'matraz' | 'libro' | 'idioma' | 'historia'
  | 'deporte' | 'computo' | 'arte' | 'musica' | 'naturaleza' | 'pensamiento';

export interface Materia {
  id: number;
  espacioId: number;
  nombre: string;
  nivel: Nivel;
  horasSemanales: number;
  icono: IconoMateria;
  tono: Tono;
}

// ---------- Docentes y asignaciones ----------
export interface Docente {
  id: number;
  nombre: string;
  especialidad: string;
  ci: string;
  telefono: string;
  email: string;
  activo: boolean; // los inactivos no se pueden asignar a materias
}

// Qué docente dicta cada materia en cada paralelo
export interface Asignacion {
  id: number;
  espacioId: number;
  gestionId: number;
  paraleloId: number;
  materiaId: number;
  docenteId: number;
}

// ---------- Jornada escolar (configuración de horarios) ----------
export const DIAS_SEMANA: { id: number; corto: string; largo: string }[] = [
  { id: 1, corto: 'Lun', largo: 'Lunes' },
  { id: 2, corto: 'Mar', largo: 'Martes' },
  { id: 3, corto: 'Mié', largo: 'Miércoles' },
  { id: 4, corto: 'Jue', largo: 'Jueves' },
  { id: 5, corto: 'Vie', largo: 'Viernes' },
  { id: 6, corto: 'Sáb', largo: 'Sábado' },
  { id: 7, corto: 'Dom', largo: 'Domingo' },
];

export interface Recreo {
  inicio: string; // "10:30": se ubica al terminar el periodo en curso a esa hora
  duracionMin: number;
}

export interface ConfigTurno {
  turno: Turno;
  activo: boolean;
  inicio: string; // "07:30"
  fin: string; // "14:00"
  recreos: Recreo[];
}

export interface ConfigJornada {
  espacioId: number;
  duracionPeriodoMin: number;
  dias: number[]; // 1 = lunes … 7 = domingo
  turnos: ConfigTurno[];
}

// Bloque del día calculado a partir de la configuración de un turno
export interface BloqueHorario {
  tipo: 'clase' | 'recreo';
  indice: number; // número de periodo de clase (0, 1, 2…); -1 en recreos
  inicio: string;
  fin: string;
}

// Una clase en el horario semanal de un paralelo
export interface ClaseHorario {
  id: number;
  espacioId: number;
  gestionId: number;
  paraleloId: number;
  dia: number;
  bloque: number; // índice del periodo de clase dentro del turno
  materiaId: number;
  aulaId: number; // aula de esta clase (por defecto, el aula fija del paralelo)
}

// Orden de presentación de paralelos: nivel (inicial → secundaria), grado y letra
export function compararParalelos(a: Paralelo, b: Paralelo): number {
  const nivel = (n: Nivel) => NIVELES.findIndex((x) => x.id === n);
  return nivel(a.nivel) - nivel(b.nivel) || a.grado - b.grado || a.letra.localeCompare(b.letra);
}
