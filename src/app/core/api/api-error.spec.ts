import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { formatWait, readApiError } from './api-error';

describe('readApiError', () => {
  it('keeps field messages from the API response', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { code: 'invalid_data', message: 'Revisa los datos enviados.', fields: { correo: 'Escribe un correo válido.' } },
    });

    expect(readApiError(error)).toEqual({
      code: 'invalid_data',
      message: 'Revisa los datos enviados.',
      fields: { correo: 'Escribe un correo válido.' },
    });
  });

  it('uses a safe message for network failures', () => {
    expect(readApiError(new HttpErrorResponse({ status: 0 })).code).toBe('network_error');
  });

  it('too many requests: says how long to wait and that nothing written is lost', () => {
    const error = new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '60' }), error: { code: 'demasiados_intentos' } });
    const result = readApiError(error);
    expect(result.retryAfterSeconds).toBe(60);
    expect(result.message).toContain('Espera 1 minuto');
    expect(result.message).toContain('lo que escribiste se conserva');
  });

  it('a locked account keeps its own explanation', () => {
    const error = new HttpErrorResponse({ status: 429, error: { code: 'cuenta_bloqueada_temporalmente', message: 'Escribiste mal la contraseña 5 veces.' } });
    expect(readApiError(error)).toEqual(jasmine.objectContaining({ code: 'cuenta_bloqueada_temporalmente', message: 'Escribiste mal la contraseña 5 veces.' }));
  });

  it('server error: never shows the server text, keeps the form and gives the support reference', () => {
    const error = new HttpErrorResponse({ status: 500, error: { code: 'error_interno', message: 'select * from usuario', reference: 'K7Q2M9XA' } });
    const result = readApiError(error);
    expect(result.reference).toBe('K7Q2M9XA');
    expect(result.message).toContain('K7Q2M9XA');
    expect(result.message).toContain('se conserva');
    expect(result.message).not.toContain('select');
  });

  it('formats the wait in seconds or minutes', () => {
    expect(formatWait(1)).toBe('1 segundo');
    expect(formatWait(30)).toBe('30 segundos');
    expect(formatWait(61)).toBe('2 minutos');
  });
});
