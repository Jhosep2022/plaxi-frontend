import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { PersonaDto, UsuarioDto } from '../models/PersonaDto';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.API_URL}/auth`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
      schemas: [NO_ERRORS_SCHEMA] // Ignora errores de propiedades desconocidas en el DOM
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear(); // Limpia localStorage después de cada prueba
    httpMock.verify();    // Verifica que no haya solicitudes pendientes
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register a user', () => {
    const usuarioDto: UsuarioDto = {
      username: 'testuser',
      password: 'password123',
      gmail: 'testuser@example.com',
      id_rol: 1
    };
    const personaDto: PersonaDto = {
      nombre: 'John',
      primer_apellido: 'Doe',
      segundo_apellido: 'Smith',
      telefono: '1234567890',
      ci: '9876543210'
    };
    const response = { success: true };

    service.registerUser(usuarioDto, personaDto).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(`${apiUrl}/register`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should login a user', () => {
    const username = 'testuser';
    const password = 'password123';
    const response = { token: '12345' };

    service.loginUser(username, password).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(`${apiUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should reset password', () => {
    const email = 'test@example.com';
    const response = { success: true };

    service.resetPassword(email).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(`${apiUrl}/reset-password?email=${email}`);
    expect(req.request.method).toBe('POST');
    req.flush(response);
  });

  it('should set and get current user ID', () => {
    const userId = 123;

    // Espía en localStorage.setItem y localStorage.getItem
    spyOn(localStorage, 'setItem').and.callThrough();
    spyOn(localStorage, 'getItem').and.returnValue(userId.toString());

    service.setCurrentUserId(userId);

    // Verifica que el userId se haya guardado en localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('userId', userId.toString());
    expect(service.getCurrentUserId()).toBe(userId);
  });

  it('should log out user', () => {
    service.setCurrentUserId(123);

    // Espía en localStorage.removeItem
    spyOn(localStorage, 'removeItem').and.callThrough();

    service.logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith('userId');
    expect(service.getCurrentUserId()).toBeNull();
  });

  it('should return isAuthenticated as observable', (done) => {
    service.isAuthenticated().subscribe((isLoggedIn) => {
      expect(isLoggedIn).toBeFalse();
      done();
    });
  });
});
