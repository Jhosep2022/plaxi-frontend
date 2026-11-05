import { BloqueHorario, ConfigTurno } from '../models/academics.model';

export const toMinutes = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const toTime = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// Calcula los periodos de clase y recreos de un turno.
// Regla: cada recreo se ubica al terminar el periodo que está en curso a su hora configurada.
// Solo se agregan periodos que terminan antes (o justo a) la hora de fin del turno.
export function generateTimeBlocks(turno: Pick<ConfigTurno, 'inicio' | 'fin' | 'recreos'>, duracionMin: number): BloqueHorario[] {
  const bloques: BloqueHorario[] = [];
  if (duracionMin <= 0) return bloques;
  const fin = toMinutes(turno.fin);
  const recreos = [...turno.recreos].filter((r) => r.duracionMin > 0).sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
  let actual = toMinutes(turno.inicio);
  let indice = 0;
  let siguienteRecreo = 0;

  while (actual + duracionMin <= fin && bloques.length < 30) {
    const recreo = recreos[siguienteRecreo];
    if (recreo && toMinutes(recreo.inicio) <= actual) {
      bloques.push({ tipo: 'recreo', indice: -1, inicio: toTime(actual), fin: toTime(actual + recreo.duracionMin) });
      actual += recreo.duracionMin;
      siguienteRecreo++;
      continue;
    }
    bloques.push({ tipo: 'clase', indice: indice++, inicio: toTime(actual), fin: toTime(actual + duracionMin) });
    actual += duracionMin;
  }
  return bloques;
}

// Bloques de clase necesarios para cubrir las horas semanales de una materia
export const requiredTimeBlocks = (horasSemanales: number, duracionMin: number): number =>
  duracionMin > 0 ? Math.ceil((horasSemanales * 60) / duracionMin) : 0;

// ¿Se cruzan dos rangos horarios? (los extremos que solo se tocan no cuentan)
export const timeRangesOverlap = (a: { inicio: string; fin: string }, b: { inicio: string; fin: string }): boolean =>
  toMinutes(a.inicio) < toMinutes(b.fin) && toMinutes(b.inicio) < toMinutes(a.fin);

export function formatDuration(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}
