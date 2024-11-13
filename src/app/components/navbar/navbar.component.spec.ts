import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { Router, NavigationEnd } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';
import { PerfilDto } from '../../models/PerfilDto';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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
      imports: [HttpClientTestingModule],
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

    // Mock de localStorage
    localStorage.getItem = jasmine.createSpy('getItem').and.callFake((key: string) => {
      if (key === 'idUsuario') return '123';
      if (key === 'userRole') return '1';
      return null;
    });
    localStorage.setItem = jasmine.createSpy('setItem').and.callFake(() => {});
    localStorage.removeItem = jasmine.createSpy('removeItem').and.callFake(() => {});
  });

  afterEach(() => {
    // Limpia las llamadas y los valores del localStorage entre pruebas
    (localStorage.getItem as jasmine.Spy).calls.reset();
    (localStorage.setItem as jasmine.Spy).calls.reset();
    (localStorage.removeItem as jasmine.Spy).calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /login on logout', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    // Aquí verificamos que el localStorage se limpia correctamente
    expect(localStorage.removeItem).toHaveBeenCalledWith('userRole');
    expect(localStorage.removeItem).toHaveBeenCalledWith('idUsuario');
  });

  it('should call cargarPerfil and obtenerRolUsuario on init', () => {
    spyOn(component, 'cargarPerfil').and.callThrough();
    spyOn(component, 'obtenerRolUsuario').and.callThrough();

    component.ngOnInit();

    expect(component.cargarPerfil).toHaveBeenCalled();
    expect(component.obtenerRolUsuario).toHaveBeenCalled();
  });

  it('should load user profile and set userRole from localStorage', () => {
    component.cargarPerfil();
    expect(mockProfileService.getProfile).toHaveBeenCalledWith(123); // Verifica que se llama con el ID correcto
    expect(localStorage.setItem).toHaveBeenCalledWith('userRole', '1');
  });

  it('should set default userRole if no role found in localStorage', () => {
    (localStorage.getItem as jasmine.Spy).and.returnValue(null); // Mock para simular que no hay `userRole`
    component.obtenerRolUsuario();
    expect(component.userRole).toBe('Estudiante');
  });

  it('should update title based on route', () => {
    component.updateTitleBasedOnRoute('/quizzes');
    expect(component.title).toBe('Quizzes');
  });

  it('should toggle dropdown state', () => {
    component.isDropdownOpen = false;
    component.toggleDropdown();
    expect(component.isDropdownOpen).toBe(true);
  });

  it('should toggle sidebar state', () => {
    component.isSidebarOpen = false;
    component.toggleSidebar();
    expect(component.isSidebarOpen).toBe(true);
  });

  it('should navigate to specific route and close sidebar', () => {
    component.isSidebarOpen = true;
    component.navigateTo('/home');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    expect(component.isSidebarOpen).toBe(false);
  });
});
