import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  code: string;
  message: string;
  fields: Record<string, string>;
}

export function readApiError(error: unknown): ApiError {
  const body = error instanceof HttpErrorResponse ? error.error : error;
  if (!isRecord(body)) return fallbackError;

  const fields = isRecord(body['fields'])
    ? Object.fromEntries(Object.entries(body['fields']).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {};

  return {
    code: typeof body['code'] === 'string' ? body['code'] : fallbackError.code,
    message: typeof body['message'] === 'string' ? body['message'] : fallbackError.message,
    fields,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const fallbackError: ApiError = {
  code: 'network_error',
  message: 'No pudimos conectar con Aulix. Revisa tu conexión e inténtalo de nuevo.',
  fields: {},
};
