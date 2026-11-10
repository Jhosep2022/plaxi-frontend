import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AuthApiService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthApiService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('logs in with credentials and permits the refresh cookie', () => {
    service.login({ username: 'ana', password: 'secret' }).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({ usuario: 'ana', clave: 'secret' });
    request.flush({ accessToken: 'token', expiraEn: 900, usuario: { id: 1, usuario: 'ana', nombre: 'Ana', primerApellido: 'López', imagenUrl: null, esAdmin: false }, membresias: [] });
  });

  it('requests a reset without expecting a recovery token in the response', () => {
    service.requestPasswordReset('ana@example.com').subscribe((result) => expect(result).toBeUndefined());
    const request = requests.expectOne(`${environment.API_URL}/auth/recuperar`);
    expect(request.request.body).toEqual({ correo: 'ana@example.com' });
    request.flush({ mensaje: 'Si existe una cuenta, enviamos un enlace.' });
  });

  it('requires the invitation code when registering an academy student', () => {
    service.register({
      tipo: 'estudiante', nombre: 'Lucía', primerApellido: 'Rojas', segundoApellido: '',
      correo: 'lucia@example.test', usuario: 'lucia', clave: 'Lucia2026', codigoCurso: 'ANG-7K2Q',
    }).subscribe();
    const request = requests.expectOne(`${environment.API_URL}/auth/registro`);
    expect(request.request.body.codigoCurso).toBe('ANG-7K2Q');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({ accessToken: 'token', expiraEn: 900, usuario: { id: 2, usuario: 'lucia', nombre: 'Lucía', primerApellido: 'Rojas', imagenUrl: null, esAdmin: false }, membresias: [] });
  });
});
