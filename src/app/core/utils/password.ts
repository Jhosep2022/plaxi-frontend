// Reglas de una contraseña segura (se muestran como lista que se va marcando)
export const PASSWORD_RULES = [
  { label: 'Al menos 8 caracteres', matches: (c: string) => c.length >= 8 },
  { label: 'Letras y números', matches: (c: string) => /[a-zA-Z]/.test(c) && /\d/.test(c) },
  { label: 'Una mayúscula', matches: (c: string) => /[A-Z]/.test(c) },
  { label: 'Un símbolo (!, #, @…)', matches: (c: string) => /[^a-zA-Z0-9]/.test(c) },
];

// Mínimo para aceptarla: las dos primeras reglas
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES[0].matches(password) && PASSWORD_RULES[1].matches(password);
}

// Mensaje de error de la contraseña ('' si es válida o está vacía)
export function getPasswordError(password: string): string {
  if (!password) return '';
  if (!PASSWORD_RULES[0].matches(password)) return 'Debe tener al menos 8 caracteres.';
  if (!PASSWORD_RULES[1].matches(password)) return 'Combina letras y números.';
  return '';
}

export function getPasswordStrength(password: string): { level: number; label: string } {
  if (!password) return { level: 0, label: '' };
  const matchedRules = PASSWORD_RULES.filter((rule) => rule.matches(password)).length;
  return matchedRules <= 1 ? { level: 1, label: 'Débil' } : matchedRules === 2 ? { level: 2, label: 'Aceptable' } : matchedRules === 3 ? { level: 3, label: 'Buena' } : { level: 4, label: 'Muy segura' };
}
