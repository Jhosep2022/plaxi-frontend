// Presentación compartida por las pantallas del módulo Académico
export { ICONOS_MATERIA, ICONO_AULA, iconoMateria } from '../../../shared/ui/iconos-academicos';

// Mensaje de error legible desde un error del servicio
export const mensajeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
