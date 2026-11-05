import { EstadoAsistencia, EstadoDia, Licencia, RegistroAsistencia } from '../models/attendance.model';

export interface Conteo {
  presente: number;
  ausente: number;
  atraso: number;
  licencia: number;
  total: number;
  porcentaje: number; // Effective attendance includes late arrivals and excludes approved leave.
}

export function contar(records: Pick<RegistroAsistencia, 'estado'>[]): Conteo {
  const c = { presente: 0, ausente: 0, atraso: 0, licencia: 0, total: records.length, porcentaje: 100 };
  for (const r of records) c[r.estado]++;
  const countedRecords = c.total - c.licencia;
  c.porcentaje = countedRecords > 0 ? Math.round(((c.presente + c.atraso) / countedRecords) * 100) : 100;
  return c;
}

// Derive the daily status from attendance records, excluding approved leave.
export function getDailyStatus(records: Pick<RegistroAsistencia, 'estado'>[]): EstadoDia | null {
  if (!records.length) return null;
  const statuses = new Set<EstadoAsistencia>(records.map((r) => r.estado));
  if (statuses.size === 1 && statuses.has('licencia')) return 'licencia';
  const withoutLeave = records.filter((r) => r.estado !== 'licencia');
  if (withoutLeave.every((r) => r.estado === 'ausente')) return 'ausente';
  if (withoutLeave.some((r) => r.estado === 'ausente')) return 'parcial';
  if (withoutLeave.some((r) => r.estado === 'atraso')) return 'atraso';
  return 'presente';
}

// Check whether approved leave covers the date.
export const leaveCoversDate = (l: Licencia, date: string): boolean => l.estado === 'aprobada' && l.desde <= date && date <= l.hasta;

// Format a local date as YYYY-MM-DD.
export function todayIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Return the weekday for a YYYY-MM-DD date (Monday = 1, Sunday = 7).
export const dayOfWeek = (date: string): number => ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) + 1;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayIso(d);
}

// Format the localized long date with an initial capital.
export function formatLongDate(date: string): string {
  return capitalize(new Date(`${date}T12:00:00`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }));
}

// Format the localized date with its year.
export function formatDateWithYear(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Format the localized month and year.
export function formatMonthYear(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}

// Format the localized short date.
export function formatShortDate(date: string): string {
  return capitalize(new Date(`${date}T12:00:00`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }));
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
