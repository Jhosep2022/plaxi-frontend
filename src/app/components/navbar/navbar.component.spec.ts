import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { Router, NavigationEnd } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { PerfilDto } from '../../models/PerfilDto';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let mockRouter: any;
  let mockProfileService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    // Mock del router
    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
      events: of(new NavigationEnd(0, '/home', '/home'))
    };

    // Mock del servicio de perfil
    mockProfileService = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(
        of({ id_rol: '1', nombre: 'Admin User' } as PerfilDto)
      )
    };

    // Mock del servicio de autenticación
    mockAuthService = {
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      declarations: [NavbarComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: AuthService, useValue: mockAuthService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update title based on route', () => {
    component.updateTitleBasedOnRoute('/home');
    expect(component.title).toBe('Dashboard');
  });

  it('should load user profile on initialization', () => {
    const userId = '1001';
    localStorage.setItem('idUsuario', userId);
    component.cargarPerfil();

    expect(mockProfileService.getProfile).toHaveBeenCalledWith(Number(userId));
    expect(component.userProfile?.nombre).toBe('Admin User');
  });

  it('should handle error when loading profile', () => {
    spyOn(console, 'error');
    mockProfileService.getProfile.and.returnValue(throwError('Error loading profile'));

    component.cargarPerfil();
    expect(console.error).toHaveBeenCalledWith('Error al cargar el perfil del usuario:', 'Error loading profile');
  });

  it('should get user role from localStorage', () => {
    localStorage.setItem('userRole', '2');
    component.obtenerRolUsuario();
    expect(component.userRole).toBe('Estudiante');
  });

  it('should navigate to the correct route when navigateTo is called', () => {
    component.navigateTo('/home');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    expect(component.isSidebarOpen).toBe(false);
  });

  it('should close session and navigate to login on logout', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(localStorage.getItem('idUsuario')).toBeNull();
  });
});
