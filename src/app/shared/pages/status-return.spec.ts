import { safeReturnUrl } from './status-return';

describe('safeReturnUrl', () => {
  it('only goes back to a page inside Aulix', () => {
    expect(safeReturnUrl('/colegio-san-jose/direccion/inicio')).toBe('/colegio-san-jose/direccion/inicio');
    expect(safeReturnUrl('//evil.example')).toBeNull();
    expect(safeReturnUrl('https://evil.example')).toBeNull();
    expect(safeReturnUrl('/error?volver=/x')).toBeNull();
    expect(safeReturnUrl(undefined)).toBeNull();
  });
});
