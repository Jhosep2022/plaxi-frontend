import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  code: string;
  message: string;
  fields: Record<string, string>;
  reference?: string; // 5xx: id of the failure in the server log, for support
  retryAfterSeconds?: number; // 429: how long to wait, when the API says so
}

// Turns any failed request into a message the person understands. The form that sent it stays as it was,
// so the messages say so: nothing written is lost (stories HU-ERR-03 and HU-ERR-05).
export function readApiError(error: unknown): ApiError {
  const status = error instanceof HttpErrorResponse ? error.status : undefined;
  const body = error instanceof HttpErrorResponse ? error.error : error;
  if (status === 0) return { ...offlineError };
  if (status === 429) return tooManyRequests(error as HttpErrorResponse, body);
  if (status !== undefined && status >= 500) return serverError(body);
  if (!isRecord(body)) return { ...offlineError };

  return {
    code: typeof body['code'] === 'string' ? body['code'] : offlineError.code,
    message: typeof body['message'] === 'string' ? body['message'] : offlineError.message,
    fields: readFields(body),
  };
}

// "30 segundos", "1 minuto", "15 minutos"
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
}

function tooManyRequests(error: HttpErrorResponse, body: unknown): ApiError {
  const header = Number(error.headers?.get('Retry-After'));
  const retryAfterSeconds = Number.isFinite(header) && header > 0 ? Math.ceil(header) : undefined;
  // A locked account already explains itself (wrong password 5 times)
  if (isRecord(body) && body['code'] === 'cuenta_bloqueada_temporalmente' && typeof body['message'] === 'string') {
    return { code: body['code'], message: body['message'], fields: {}, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
  }
  const wait = retryAfterSeconds ? `Espera ${formatWait(retryAfterSeconds)}` : 'Espera un momento';
  return {
    code: 'demasiados_intentos',
    message: `Hiciste muchos intentos seguidos. ${wait} y vuelve a intentarlo; lo que escribiste se conserva.`,
    fields: {},
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

function serverError(body: unknown): ApiError {
  const reference = isRecord(body) && typeof body['reference'] === 'string' ? body['reference'] : undefined;
  return {
    code: 'error_servidor',
    message: `Tuvimos un problema en el servidor y no se guardó. Lo que escribiste se conserva: vuelve a intentarlo en un momento.${
      reference ? ` Si se repite, pasa esta referencia a soporte: ${reference}.` : ''
    }`,
    fields: {},
    ...(reference ? { reference } : {}),
  };
}

function readFields(body: Record<string, unknown>): Record<string, string> {
  return isRecord(body['fields'])
    ? Object.fromEntries(Object.entries(body['fields']).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const offlineError: ApiError = {
  code: 'network_error',
  message: 'No pudimos conectar con Aulix. Revisa tu conexión: lo que escribiste se conserva y puedes intentarlo de nuevo.',
  fields: {},
};
