import { BloqueHorario, ConfigTurno } from '../models/academics.model';

export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

export const toTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// Place each break after the current class period and include only blocks ending within the shift.
export function generateTimeBlocks(shift: Pick<ConfigTurno, 'inicio' | 'fin' | 'recreos'>, durationMinutes: number): BloqueHorario[] {
  const blocks: BloqueHorario[] = [];
  if (durationMinutes <= 0) return blocks;
  const end = toMinutes(shift.fin);
  const breaks = [...shift.recreos].filter((item) => item.duracionMin > 0).sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
  let current = toMinutes(shift.inicio);
  let index = 0;
  let nextBreak = 0;

  while (current + durationMinutes <= end && blocks.length < 30) {
    const breakPeriod = breaks[nextBreak];
    if (breakPeriod && toMinutes(breakPeriod.inicio) <= current) {
      blocks.push({ tipo: 'recreo', indice: -1, inicio: toTime(current), fin: toTime(current + breakPeriod.duracionMin) });
      current += breakPeriod.duracionMin;
      nextBreak++;
      continue;
    }
    blocks.push({ tipo: 'clase', indice: index++, inicio: toTime(current), fin: toTime(current + durationMinutes) });
    current += durationMinutes;
  }
  return blocks;
}

// Calculate how many periods are needed for a subject's weekly hours.
export const requiredTimeBlocks = (weeklyHours: number, durationMinutes: number): number =>
  durationMinutes > 0 ? Math.ceil((weeklyHours * 60) / durationMinutes) : 0;

// Adjacent time ranges do not overlap.
export const timeRangesOverlap = (a: { inicio: string; fin: string }, b: { inicio: string; fin: string }): boolean =>
  toMinutes(a.inicio) < toMinutes(b.fin) && toMinutes(b.inicio) < toMinutes(a.fin);

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours && remainder ? `${hours} h ${remainder} min` : hours ? `${hours} h` : `${remainder} min`;
}
