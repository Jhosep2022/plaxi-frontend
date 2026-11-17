import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NavigationError, RedirectCommand, Router, provideRouter } from '@angular/router';
import { handleNavigationError } from './navigation-errors';

describe('handleNavigationError', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  const redirectFor = (error: unknown, url = '/colegio/direccion/inicio') =>
    TestBed.runInInjectionContext(() => handleNavigationError(new NavigationError(1, url, error)));
  const target = (result: RedirectCommand | undefined) => TestBed.inject(Router).serializeUrl((result as RedirectCommand).redirectTo as never);

  it('a page whose code could not download goes to "sin conexión" and remembers where to go back', () => {
    expect(target(redirectFor(new Error('ChunkLoadError: Loading chunk 12 failed')))).toBe('/sin-conexion?volver=%2Fcolegio%2Fdireccion%2Finicio');
  });

  it('a server error goes to the 500 page with the support reference', () => {
    const error = new HttpErrorResponse({ status: 503, error: { reference: 'K7Q2M9XA' } });
    expect(target(redirectFor(error))).toContain('/error?volver=');
    expect(target(redirectFor(error))).toContain('ref=K7Q2M9XA');
  });

  it('too many requests goes to the 429 page with the seconds to wait', () => {
    const error = new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '30' }) });
    expect(target(redirectFor(error))).toContain('/demasiados-intentos?volver=');
    expect(target(redirectFor(error))).toContain('segundos=30');
  });

  it('leaves other errors alone and never loops on a status page', () => {
    expect(redirectFor(new HttpErrorResponse({ status: 404 }))).toBeUndefined();
    expect(redirectFor(new Error('ChunkLoadError'), '/sin-conexion')).toBeUndefined();
  });
});
