import { EstadoAsistencia, EstadoDia, Licencia, RegistroAsistencia } from '../models/asistencia.model';

export interface Conteo {
  presente: number;
  ausente: number;
  atraso: number;
  licencia: number;
  total: number;
  porcentaje: number; // asistencia efectiva: presentes + atrasos (las licencias no cuentan en contra)
}

export function contar(registros: Pick<RegistroAsistencia, 'estado'>[]): Conteo {
  const c = { presente: 0, ausente: 0, atraso: 0, licencia: 0, total: registros.length, porcentaje: 100 };
  for (const r of registros) c[r.estado]++;
  const computables = c.total - c.licencia;
  c.porcentaje = computables > 0 ? Math.round(((c.presente + c.atraso) / computables) * 100) : 100;
  return c;
}

// Resumen diario de un estudiante a partir de sus registros de ese día:
// faltó a todo = ausente; licencia en todo = licencia; faltó solo a algunas = parcial;
// algún atraso sin faltas = atraso; si no, asistió.
export function estadoDelDia(registros: Pick<RegistroAsistencia, 'estado'>[]): EstadoDia | null {
  if (!registros.length) return null;
  const estados = new Set<EstadoAsistencia>(registros.map((r) => r.estado));
  if (estados.size === 1 && estados.has('licencia')) return 'licencia';
  const sinLicencia = registros.filter((r) => r.estado !== 'licencia');
  if (sinLicencia.every((r) => r.estado === 'ausente')) return 'ausente';
  if (sinLicencia.some((r) => r.estado === 'ausente')) return 'parcial';
  if (sinLicencia.some((r) => r.estado === 'atraso')) return 'atraso';
  return 'presente';
}

// ¿La licencia aprobada cubre esta fecha?
export const licenciaCubre = (l: Licencia, fecha: string): boolean => l.estado === 'aprobada' && l.desde <= fecha && fecha <= l.hasta;

// Fecha local en formato YYYY-MM-DD
export function hoyIso(fecha = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Día de la semana de una fecha YYYY-MM-DD (1 = lunes … 7 = domingo)
export const diaDeSemana = (fecha: string): number => ((new Date(`${fecha}T12:00:00`).getDay() + 6) % 7) + 1;

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return hoyIso(d);
}

// "Lunes, 19 de octubre" (solo la primera letra en mayúscula)
export function fechaLarga(fecha: string): string {
  return capitalizar(new Date(`${fecha}T12:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }));
}

// "5 de noviembre de 1986"
export function fechaConAnio(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "febrero de 2024"
export function mesAnio(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}

// "Vie, 16 oct"
export function fechaCorta(fecha: string): string {
  return capitalizar(new Date(`${fecha}T12:00:00`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }));
}

const capitalizar = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);
