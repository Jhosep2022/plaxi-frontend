import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Mock del AuthService
    mockAuthService = {
      resetPassword: jasmine.createSpy('resetPassword').and.returnValue(of({}))
    };

    // Mock del Router
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [ForgotPasswordComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
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
