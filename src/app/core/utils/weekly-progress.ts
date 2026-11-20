import { addDays } from './attendance';

// Avance de los pendientes que muestra el anillo del avatar en el inicio
export interface AvancePendientes {
  hechos: number;
  total: number;
  texto: string; // tooltip: "Revisaste 12 de 15 entregas"
}

export interface Parte {
  hechos: number;
  total: number;
  texto: (hechos: number, total: number) => string;
}

// Junta las partes de cada rol; sin nada que medir no hay avance (el anillo se ve completo)
export function avanceDe(partes: Parte[]): AvancePendientes | undefined {
  const conDatos = partes.filter((p) => p.total > 0);
  if (!conDatos.length) return undefined;
  return {
    hechos: conDatos.reduce((s, p) => s + Math.min(p.hechos, p.total), 0),
    total: conDatos.reduce((s, p) => s + p.total, 0),
    texto: conDatos.map((p) => p.texto(Math.min(p.hechos, p.total), p.total)).join(' · '),
  };
}

export function porcentajeAvance(avance: AvancePendientes | undefined): number {
  return avance ? Math.round((avance.hechos / avance.total) * 100) : 100;
}

// Lunes y domingo de la semana de una fecha (YYYY-MM-DD)
export function semanaDe(fecha: string): { desde: string; hasta: string } {
  const dia = new Date(`${fecha}T12:00:00`).getDay(); // 0 = domingo
  const desde = addDays(fecha, dia === 0 ? -6 : 1 - dia);
  return { desde, hasta: addDays(desde, 6) };
}
