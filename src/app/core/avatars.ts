// Avatar gallery of Aulix (same catalog as material/avatares and the backend's profile/avatars.ts).
// The account stores only the chosen code; the images live in assets/avatars/<code>.svg.

export const AVATAR_ANIMALS = [
  { id: 'zorro', label: 'Zorro' },
  { id: 'buho', label: 'Búho' },
  { id: 'oso', label: 'Oso' },
  { id: 'gato', label: 'Gato' },
  { id: 'perro', label: 'Perro' },
  { id: 'conejo', label: 'Conejo' },
  { id: 'panda', label: 'Panda' },
  { id: 'llama', label: 'Llama' },
  { id: 'rana', label: 'Rana' },
  { id: 'pinguino', label: 'Pingüino' },
  { id: 'leon', label: 'León' },
  { id: 'mono', label: 'Mono' },
] as const;

export const AVATAR_CODES: readonly string[] = AVATAR_ANIMALS.flatMap((animal) => [1, 2, 3].map((n) => `${animal.id}-0${n}`));

export const INITIALS_COLORS = [
  { code: 'iniciales-01', background: '#0a0a23', text: '#bccf4e' },
  { code: 'iniciales-02', background: '#bccf4e', text: '#0a0a23' },
  { code: 'iniciales-03', background: '#f08a4b', text: '#ffffff' },
  { code: 'iniciales-04', background: '#262a72', text: '#ffffff' },
  { code: 'iniciales-05', background: '#f6e7d8', text: '#0a0a23' },
  { code: 'iniciales-06', background: '#6e7493', text: '#ffffff' },
  { code: 'iniciales-07', background: '#2fa760', text: '#ffffff' },
  { code: 'iniciales-08', background: '#e4dcfb', text: '#262a72' },
] as const;

export function isInitialsCode(code: string): boolean {
  return INITIALS_COLORS.some((color) => color.code === code);
}

export function isAvatarCode(code: string): boolean {
  return AVATAR_CODES.includes(code) || isInitialsCode(code);
}

// Automatic avatar: always the same for the same account (HU-AV-01). Same formula as the backend.
export function defaultAvatar(accountId: number): string {
  const mixed = Math.imul(accountId ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
  return AVATAR_CODES[mixed % AVATAR_CODES.length];
}

export function avatarUrl(code: string): string {
  return `assets/avatars/${code}.svg`;
}

// Readable name for tooltips and alt text: "Zorro 1", "Iniciales 3"
export function avatarLabel(code: string): string {
  const [id, number] = code.split('-');
  const animal = AVATAR_ANIMALS.find((a) => a.id === id);
  return `${animal?.label ?? 'Iniciales'} ${Number(number)}`;
}

export function initialsColor(code: string) {
  return INITIALS_COLORS.find((color) => color.code === code) ?? INITIALS_COLORS[0];
}

// "María José Pérez" -> "MP"
export function initials(firstName: string, lastName = ''): string {
  return (firstName.trim().charAt(0) + lastName.trim().charAt(0)).toUpperCase() || '?';
}
