import type { Entrega, EstadoEntrega, Tarea } from '../models/assignments.model';
import { addDays, todayIso } from './attendance';

export const deadline = (assignment: Pick<Tarea, 'entrega' | 'hora'>): string => `${assignment.entrega}T${assignment.hora}`;

export function currentDateTimeIso(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${todayIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const isPastDue = (assignment: Pick<Tarea, 'entrega' | 'hora'>): boolean => currentDateTimeIso() > deadline(assignment);

// Derive the student's submission status for an assignment.
export function getSubmissionStatus(assignment: Tarea, submission: Entrega | undefined): EstadoEntrega {
  if (submission?.revisada) return 'revisada';
  if (submission?.entregadaEl) return submission.entregadaEl > deadline(assignment) ? 'tarde' : 'entregada';
  return isPastDue(assignment) ? 'no-entregada' : 'pendiente';
}

// Format the due date for display in Spanish.
export function formatDueDate(assignment: Pick<Tarea, 'entrega' | 'hora'>): string {
  const today = todayIso();
  if (assignment.entrega === today) return isPastDue(assignment) ? `Venció hoy a las ${assignment.hora}` : `Vence hoy a las ${assignment.hora}`;
  if (assignment.entrega === addDays(today, 1)) return 'Vence mañana';
  if (assignment.entrega === addDays(today, -1)) return 'Venció ayer';
  const days = Math.round((Date.parse(`${assignment.entrega}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86400000);
  return days > 0 ? `Vence en ${days} días` : `Venció hace ${-days} días`;
}

// An assignment is due soon when at most two days remain.
export const isDueSoon = (assignment: Pick<Tarea, 'entrega' | 'hora'>): boolean => !isPastDue(assignment) && assignment.entrega <= addDays(todayIso(), 2);
