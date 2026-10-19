import { BloqueHorario, ConfigTurno } from '../models/academico.model';

export const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const aHora = (minutos: number): string =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// Calcula los periodos de clase y recreos de un turno.
// Regla: cada recreo se ubica al terminar el periodo que está en curso a su hora configurada.
// Solo se agregan periodos que terminan antes (o justo a) la hora de fin del turno.
export function generarBloques(turno: Pick<ConfigTurno, 'inicio' | 'fin' | 'recreos'>, duracionMin: number): BloqueHorario[] {
  const bloques: BloqueHorario[] = [];
  if (duracionMin <= 0) return bloques;
  const fin = aMinutos(turno.fin);
  const recreos = [...turno.recreos].filter((r) => r.duracionMin > 0).sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio));
  let actual = aMinutos(turno.inicio);
  let indice = 0;
  let siguienteRecreo = 0;

  while (actual + duracionMin <= fin && bloques.length < 30) {
    const recreo = recreos[siguienteRecreo];
    if (recreo && aMinutos(recreo.inicio) <= actual) {
      bloques.push({ tipo: 'recreo', indice: -1, inicio: aHora(actual), fin: aHora(actual + recreo.duracionMin) });
      actual += recreo.duracionMin;
      siguienteRecreo++;
      continue;
    }
    bloques.push({ tipo: 'clase', indice: indice++, inicio: aHora(actual), fin: aHora(actual + duracionMin) });
    actual += duracionMin;
  }
  return bloques;
}

// Bloques de clase necesarios para cubrir las horas semanales de una materia
export const bloquesNecesarios = (horasSemanales: number, duracionMin: number): number =>
  duracionMin > 0 ? Math.ceil((horasSemanales * 60) / duracionMin) : 0;

// ¿Se cruzan dos rangos horarios? (los extremos que solo se tocan no cuentan)
export const seCruzan = (a: { inicio: string; fin: string }, b: { inicio: string; fin: string }): boolean =>
  aMinutos(a.inicio) < aMinutos(b.fin) && aMinutos(b.inicio) < aMinutos(a.fin);

export function duracionLabel(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}
