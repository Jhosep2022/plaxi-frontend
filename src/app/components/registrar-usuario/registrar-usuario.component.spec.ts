import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrarUsuarioComponent } from './registrar-usuario.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('RegistrarUsuarioComponent', () => {
  let component: RegistrarUsuarioComponent;
  let fixture: ComponentFixture<RegistrarUsuarioComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Simulación del AuthService
    mockAuthService = {
      registerUser: jasmine.createSpy('registerUser').and.returnValue(of({ success: true }))
    };

    // Simulación del Router
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [RegistrarUsuarioComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignorar errores de plantillas no relacionadas con este test
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarUsuarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error if fields are incomplete', () => {
    component.onRegister();
    expect(component.errorMessage).toBe('Por favor, completa todos los campos.');
  });

  it('should show error if email format is invalid', () => {
    component.username = 'testUser';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.gmail = 'invalidEmail';
    component.nombre = 'Nombre';
    component.primerApellido = 'Apellido';
    component.telefono = '123456789';
    component.ci = '123456';

    component.onRegister();
    expect(component.errorMessage).toBe('El formato del correo no es válido.');
  });

  it('should show error if passwords do not match', () => {
    component.username = 'testUser';
    component.password = 'password123';
    component.confirmPassword = 'password456';
    component.gmail = 'test@example.com';
    component.nombre = 'Nombre';
    component.primerApellido = 'Apellido';
    component.telefono = '123456789';
    component.ci = '123456';

    component.onRegister();
    expect(component.errorMessage).toBe('Las contraseñas no coinciden. Por favor, intenta de nuevo.');
  });

  it('should register user and navigate to login on success', () => {
    // Asignación de valores de formulario válidos
    component.username = 'testUser';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.gmail = 'test@example.com';
    component.nombre = 'Nombre';
    component.primerApellido = 'Apellido';
    component.segundoApellido = 'Apellido2';
    component.telefono = '123456789';
    component.ci = '123456';

    component.onRegister();

    expect(mockAuthService.registerUser).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should show error message on registration failure', () => {
    mockAuthService.registerUser.and.returnValue(throwError('Error de registro'));

    component.username = 'testUser';
    component.password = 'password123';
    component.confirmPassword = 'password123';
    component.gmail = 'test@example.com';
    component.nombre = 'Nombre';
    component.primerApellido = 'Apellido';
    component.segundoApellido = 'Apellido2';
    component.telefono = '123456789';
    component.ci = '123456';

    component.onRegister();

    expect(component.errorMessage).toBe('Error al registrar. Por favor, inténtalo nuevamente.');
  });
});
