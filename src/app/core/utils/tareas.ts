import type { Entrega, EstadoEntrega, Tarea } from '../models/tareas.model';
import { hoyIso, sumarDias } from './asistencia';

export const limite = (t: Pick<Tarea, 'entrega' | 'hora'>): string => `${t.entrega}T${t.hora}`;

export function ahoraIso(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${hoyIso(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

export const vencida = (t: Pick<Tarea, 'entrega' | 'hora'>): boolean => ahoraIso() > limite(t);

// Estado de la entrega de un estudiante en una tarea
export function estadoEntrega(t: Tarea, e: Entrega | undefined): EstadoEntrega {
  if (e?.revisada) return 'revisada';
  if (e?.entregadaEl) return e.entregadaEl > limite(t) ? 'tarde' : 'entregada';
  return vencida(t) ? 'no-entregada' : 'pendiente';
}

// "Vence hoy a las 23:59", "Vence mañana", "Vence en 3 días", "Venció ayer", "Venció hace 4 días"
export function venceLabel(t: Pick<Tarea, 'entrega' | 'hora'>): string {
  const hoy = hoyIso();
  if (t.entrega === hoy) return vencida(t) ? `Venció hoy a las ${t.hora}` : `Vence hoy a las ${t.hora}`;
  if (t.entrega === sumarDias(hoy, 1)) return 'Vence mañana';
  if (t.entrega === sumarDias(hoy, -1)) return 'Venció ayer';
  const dias = Math.round((Date.parse(`${t.entrega}T12:00:00`) - Date.parse(`${hoy}T12:00:00`)) / 86400000);
  return dias > 0 ? `Vence en ${dias} días` : `Venció hace ${-dias} días`;
}

// Faltan 2 días o menos para la fecha límite
export const urgente = (t: Pick<Tarea, 'entrega' | 'hora'>): boolean => !vencida(t) && t.entrega <= sumarDias(hoyIso(), 2);
