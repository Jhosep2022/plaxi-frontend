import { CATEGORIAS_COMUNICADO, CategoriaComunicado, PUBLICOS, Publico } from '../../core/models/comunicados.model';
import { fechaCorta, hoyIso, sumarDias } from '../../core/utils/asistencia';

// "Hoy 08:10", "Ayer 16:30" o "Vie, 16 oct"
export function cuando(iso: string): string {
  const [fecha, hora = ''] = iso.split('T');
  const hh = hora.slice(0, 5);
  if (fecha === hoyIso()) return `Hoy ${hh}`;
  if (fecha === sumarDias(hoyIso(), -1)) return `Ayer ${hh}`;
  return fechaCorta(fecha);
}

export const categoria = (id: CategoriaComunicado) => CATEGORIAS_COMUNICADO.find((c) => c.id === id)!;

export function publicoLabel(publico: Publico[]): string {
  return publico.map((p) => PUBLICOS.find((x) => x.id === p)?.label.toLowerCase()).join(', ');
}
