// Reglas de una contraseña segura (se muestran como lista que se va marcando)
export const REGLAS_CLAVE = [
  { label: 'Al menos 8 caracteres', cumple: (c: string) => c.length >= 8 },
  { label: 'Letras y números', cumple: (c: string) => /[a-zA-Z]/.test(c) && /\d/.test(c) },
  { label: 'Una mayúscula', cumple: (c: string) => /[A-Z]/.test(c) },
  { label: 'Un símbolo (!, #, @…)', cumple: (c: string) => /[^a-zA-Z0-9]/.test(c) },
];

// Mínimo para aceptarla: las dos primeras reglas
export function claveValida(clave: string): boolean {
  return REGLAS_CLAVE[0].cumple(clave) && REGLAS_CLAVE[1].cumple(clave);
}

// Mensaje de error de la contraseña ('' si es válida o está vacía)
export function errorClave(clave: string): string {
  if (!clave) return '';
  if (!REGLAS_CLAVE[0].cumple(clave)) return 'Debe tener al menos 8 caracteres.';
  if (!REGLAS_CLAVE[1].cumple(clave)) return 'Combina letras y números.';
  return '';
}

export function fuerzaClave(clave: string): { nivel: number; label: string } {
  if (!clave) return { nivel: 0, label: '' };
  const n = REGLAS_CLAVE.filter((r) => r.cumple(clave)).length;
  return n <= 1 ? { nivel: 1, label: 'Débil' } : n === 2 ? { nivel: 2, label: 'Aceptable' } : n === 3 ? { nivel: 3, label: 'Buena' } : { nivel: 4, label: 'Muy segura' };
}
