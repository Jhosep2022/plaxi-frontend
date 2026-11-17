import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router, UrlTree, type Route, type UrlSegment } from '@angular/router';
import { SessionService } from '../auth/session.service';
import { authGuard, termsGuard } from './session.guards';

// T07: an account must change its temporary password first, then accept the terms, before using the app
describe('pending steps after sign-in', () => {
  let session: SessionService;
  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as Route, [] as UrlSegment[], {} as never)) as boolean | UrlTree;
  const url = (result: boolean | UrlTree) => (result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    session = TestBed.inject(SessionService);
    session.applyApiSession({
      accessToken: 'token',
      expiraEn: 900,
      usuario: { id: 7, usuario: 'luis', nombre: 'Luis', primerApellido: 'Mamani', imagenUrl: null, esAdmin: false, passwordChangeRequired: true, terminosPendientes: true },
      membresias: [],
    });
  });

  it('asks for the temporary password before the terms', () => {
    expect(session.pendingStep()).toBe('/cambiar-clave-temporal');
    expect(url(run(authGuard))).toBe('/cambiar-clave-temporal');
    expect(url(run(termsGuard))).toBe('/cambiar-clave-temporal');
  });

  it('then sends every protected page to the terms', () => {
    session.finishTemporaryPasswordChange();
    expect(url(run(authGuard))).toBe('/aceptar-terminos');
    expect(run(termsGuard)).toBeTrue();
  });

  it('lets the account in once it accepts', () => {
    session.finishTemporaryPasswordChange();
    session.finishTermsAcceptance();
    expect(session.pendingStep()).toBeNull();
    expect(run(authGuard)).toBeTrue();
    expect(url(run(termsGuard))).not.toBe('/aceptar-terminos');
  });
});
