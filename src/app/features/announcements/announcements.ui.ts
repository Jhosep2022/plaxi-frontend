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

// Text and link to paste in the families' WhatsApp groups. The full message stays in Aulix:
// only the title, the event date and the start of the message travel, plus the link to read it.
export function whatsappShareUrl(
  notice: { id: number; titulo: string; mensaje: string; fechaEvento: string },
  school: { nombre: string; slug: string },
  origin = location.origin,
): string {
  const preview = notice.mensaje.length > 280 ? notice.mensaje.slice(0, 277).trimEnd() + '…' : notice.mensaje;
  const date = notice.fechaEvento ? `📅 ${formatShortDate(notice.fechaEvento)}\n` : '';
  const link = `${origin}/comunicado/${encodeURIComponent(school.slug)}/${notice.id}`;
  const text = `📢 *${notice.titulo}*\n${date}\n${preview}\n\nLéelo completo en Aulix: ${link}\n— ${school.nombre}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function publicoLabel(publico: Publico[]): string {
  return publico.map((p) => PUBLICOS.find((x) => x.id === p)?.label.toLowerCase()).join(', ');
}
