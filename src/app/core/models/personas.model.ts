// ---------- Padres y tutores legales ----------
export type Parentesco = 'madre' | 'padre' | 'tutor';

export const PARENTESCOS: { id: Parentesco; label: string }[] = [
  { id: 'madre', label: 'Madre' },
  { id: 'padre', label: 'Padre' },
  { id: 'tutor', label: 'Tutor legal' },
];

export interface Tutor {
  id: number;
  nombre: string;
  ci: string;
  telefono: string;
  email: string;
  ocupacion: string;
}

// Relación de un padre / tutor legal con un estudiante a su cargo
export interface Vinculo {
  id: number;
  padreId: number;
  estudianteId: number;
  parentesco: Parentesco;
}

// Edad en años cumplidos a una fecha (YYYY-MM-DD)
export function edad(fechaNacimiento: string, hoy: string): number {
  const [a, m, d] = fechaNacimiento.split('-').map(Number);
  const [ha, hm, hd] = hoy.split('-').map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

export const iniciales = (nombre: string): string =>
  nombre.split(' ').filter(Boolean).map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase();
