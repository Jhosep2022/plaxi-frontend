import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdateperfilComponent } from './updateperfil.component';
import { ProfileService } from 'src/app/services/profile.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

describe('UpdateperfilComponent', () => {
  let component: UpdateperfilComponent;
  let fixture: ComponentFixture<UpdateperfilComponent>;
  let mockProfileService: any;
  let mockRouter: any;

  beforeEach(async () => {
    // Simulaciones para los servicios
    mockProfileService = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(of({
        username: 'user123',
        gmail: 'user@example.com',
        nombre: 'User',
        primerApellido: 'Apellido1',
        segundoApellido: 'Apellido2',
        telefono: '123456789',
        ci: '789456'
      })),
      updateProfile: jasmine.createSpy('updateProfile').and.returnValue(of({ message: 'Perfil actualizado' }))
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      declarations: [ UpdateperfilComponent ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule // Añade FormsModule y ReactiveFormsModule
      ],
      providers: [
        { provide: ProfileService, useValue: mockProfileService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateperfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile data on initialization', () => {
    component.ngOnInit();
    expect(mockProfileService.getProfile).toHaveBeenCalled();
    expect(component.perfilDto.username).toBe('user123');
  });

  it('should validate file selection for valid image types', () => {
    const validFile = new File([''], 'image.jpg', { type: 'image/jpeg' });
    component.onFileSelected({ target: { files: [validFile] } });
    expect(component.selectedFile).toEqual(validFile);
    expect(component.fileError).toBeNull();
  });

  it('should show error for invalid file types', () => {
    const invalidFile = new File([''], 'document.pdf', { type: 'application/pdf' });
    component.onFileSelected({ target: { files: [invalidFile] } });
    expect(component.selectedFile).toBeNull();
    expect(component.fileError).toBe('Por favor, selecciona un archivo con formato .jpg, .jpeg o .png');
  });

  it('should update profile and navigate to perfil on success', () => {
    component.actualizarPerfil();
    expect(mockProfileService.updateProfile).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/perfil']);
  });

  it('should handle update profile error', () => {
    spyOn(console, 'error');
    mockProfileService.updateProfile.and.returnValue(throwError('Error al actualizar el perfil'));
    component.actualizarPerfil();
    expect(console.error).toHaveBeenCalledWith('Error al actualizar el perfil:', 'Error al actualizar el perfil');
  });

  it('should navigate to perfil on cancel', () => {
    component.cancelar();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/perfil']);
  });
});
