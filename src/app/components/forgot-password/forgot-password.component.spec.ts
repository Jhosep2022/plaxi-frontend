import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';  // Importación de FormsModule para ngModel
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Mock de AuthService
    mockAuthService = {
      resetPassword: jasmine.createSpy('resetPassword').and.returnValue(of({}))
    };

    // Mock de Router
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [ForgotPasswordComponent],
      imports: [
        HttpClientTestingModule,
        FormsModule // Agregamos FormsModule para permitir el uso de ngModel
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Incluimos NO_ERRORS_SCHEMA para evitar errores por enlaces desconocidos
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show alert if email is empty on submit', () => {
    spyOn(window, 'alert');
    component.email = '';
    component.onSubmit();
    expect(window.alert).toHaveBeenCalledWith('Por favor, introduce un correo electrónico.');
  });

  it('should call resetPassword with correct email', () => {
    component.email = 'test@example.com';
    component.onSubmit();
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('should navigate to login after successful resetPassword call', () => {
    component.email = 'test@example.com';
    component.onSubmit();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should show alert on resetPassword error', () => {
    spyOn(window, 'alert');
    mockAuthService.resetPassword.and.returnValue(throwError('error'));
    component.email = 'test@example.com';
    component.onSubmit();
    expect(window.alert).toHaveBeenCalledWith('Hubo un problema al intentar enviar el correo. Inténtalo de nuevo más tarde.');
  });
});
