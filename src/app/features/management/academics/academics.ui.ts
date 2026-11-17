import { HttpErrorResponse } from '@angular/common/http';
import { readApiError } from '../../../core/api/api-error';

// Shared presentation helpers for academic screens.
export {
  SUBJECT_ICONS,
  CLASSROOM_ICONS,
  subjectIcon,
} from '../../../shared/ui/academic-icons';

// Return a readable message for service errors: the API message ({ code, message }) or the error's own.
export const getErrorMessage = (error: unknown): string =>
  error instanceof HttpErrorResponse
    ? readApiError(error).message
    : error instanceof Error
      ? error.message
      : 'Ocurrió un error inesperado.';
