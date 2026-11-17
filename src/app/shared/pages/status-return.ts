// Where "Reintentar" goes back to: only a path inside Aulix ("/colegio/..."), never another site ("//evil.com")
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.startsWith('/error') || value.startsWith('/sin-conexion') || value.startsWith('/demasiados-intentos')) return null;
  return value;
}
