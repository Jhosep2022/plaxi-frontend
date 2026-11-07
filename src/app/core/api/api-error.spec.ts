import { HttpErrorResponse } from '@angular/common/http';
import { readApiError } from './api-error';

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
});
