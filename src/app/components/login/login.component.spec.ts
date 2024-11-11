import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Mock de AuthService
    mockAuthService = {
      loginUser: jasmine.createSpy('loginUser')
    };

    // Mock de Router
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display error if username or password is empty', () => {
    component.username = '';
    component.password = '';
    component.onLogin();
    expect(component.errorMessage).toBe('Por favor, ingresa tu nombre de usuario y tu contraseña.');
  });

  it('should call loginUser on AuthService with correct credentials', () => {
    component.username = 'testuser';
    component.password = 'testpassword';
    mockAuthService.loginUser.and.returnValue(of({ success: true, data: { id_usuario: 1, id_rol: 2 } }));

    component.onLogin();
    expect(mockAuthService.loginUser).toHaveBeenCalledWith('testuser', 'testpassword');
  });

  it('should navigate to home on successful login', () => {
    component.username = 'testuser';
    component.password = 'testpassword';
    mockAuthService.loginUser.and.returnValue(of({ success: true, data: { id_usuario: 1, id_rol: 2 } }));

    component.onLogin();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should display error message on failed login', () => {
    component.username = 'invaliduser';
    component.password = 'invalidpassword';
    mockAuthService.loginUser.and.returnValue(of({ success: false }));

    component.onLogin();
    expect(component.errorMessage).toBe('Inicio de sesión fallido. Usuario no encontrado.');
  });

  it('should display server error message on login error', () => {
    component.username = 'testuser';
    component.password = 'testpassword';
    mockAuthService.loginUser.and.returnValue(throwError('Error en el servidor'));

    component.onLogin();
    expect(component.errorMessage).toBe('Error en el servidor. Inténtalo de nuevo más tarde.');
  });
});
