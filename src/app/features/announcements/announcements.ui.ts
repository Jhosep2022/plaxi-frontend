import { CATEGORIAS_COMUNICADO, CategoriaComunicado, PUBLICOS, Publico } from '../../core/models/announcements.model';
import { formatShortDate, todayIso, addDays } from '../../core/utils/attendance';

// "Hoy 08:10", "Ayer 16:30" o "Vie, 16 oct"
export function cuando(iso: string): string {
  const [fecha, hora = ''] = iso.split('T');
  const hh = hora.slice(0, 5);
  if (fecha === todayIso()) return `Hoy ${hh}`;
  if (fecha === addDays(todayIso(), -1)) return `Ayer ${hh}`;
  return formatShortDate(fecha);
}

export const categoria = (id: CategoriaComunicado) => CATEGORIAS_COMUNICADO.find((c) => c.id === id)!;

export function publicoLabel(publico: Publico[]): string {
  return publico.map((p) => PUBLICOS.find((x) => x.id === p)?.label.toLowerCase()).join(', ');
}
