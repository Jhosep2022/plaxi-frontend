import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { Router, NavigationEnd } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
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
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /login on logout', () => {
    component.logout();
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(localStorage.getItem('idUsuario')).toBeNull();
  });
});
