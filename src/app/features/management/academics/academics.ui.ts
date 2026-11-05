// Shared presentation helpers for academic screens.
export { SUBJECT_ICONS, CLASSROOM_ICONS, subjectIcon } from '../../../shared/ui/academic-icons';

// Return a readable message for service errors.
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
