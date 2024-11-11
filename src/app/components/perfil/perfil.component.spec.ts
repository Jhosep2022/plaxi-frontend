import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilComponent } from './perfil.component';
import { ProfileService } from '../../services/profile.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PerfilComponent', () => {
  let component: PerfilComponent;
  let fixture: ComponentFixture<PerfilComponent>;
  let mockProfileService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Mock del servicio de perfil
    mockProfileService = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(
        of({ id: 1002, nombre: 'John Doe' })
      )
    };

    // Mock del router
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [PerfilComponent],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load user profile on initialization', () => {
    const userId = '1002';
    localStorage.setItem('idUsuario', userId);
    component.ngOnInit();
    expect(mockProfileService.getProfile).toHaveBeenCalledWith(Number(userId));
    expect(component.user.nombre).toBe('John Doe');
  });

  it('should handle error when loading profile', () => {
    spyOn(console, 'error');
    mockProfileService.getProfile.and.returnValue(throwError('Error loading profile'));

    component.cargarPerfil(1002);
    expect(console.error).toHaveBeenCalledWith('Error al cargar el perfil del usuario:', 'Error loading profile');
  });

  it('should navigate to login if user ID is not found', () => {
    localStorage.removeItem('idUsuario');
    component.ngOnInit();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should remove user ID from localStorage and navigate to login on logout', () => {
    localStorage.setItem('idUsuario', '1002');
    component.cerrarSesion();
    expect(localStorage.getItem('idUsuario')).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should log "Editar Perfil está deshabilitado" when editarPerfil is called', () => {
    spyOn(console, 'log');
    component.editarPerfil();
    expect(console.log).toHaveBeenCalledWith('Editar Perfil está deshabilitado');
  });

  it('should log "Dar de baja está deshabilitado" when abrirDialogoConfirmacion is called', () => {
    spyOn(console, 'log');
    component.abrirDialogoConfirmacion();
    expect(console.log).toHaveBeenCalledWith('Dar de baja está deshabilitado');
  });
});
