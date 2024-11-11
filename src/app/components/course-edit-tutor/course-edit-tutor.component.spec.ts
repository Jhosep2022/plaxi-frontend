import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseEditTutorComponent } from './course-edit-tutor.component';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CourseEditTutorComponent', () => {
  let component: CourseEditTutorComponent;
  let fixture: ComponentFixture<CourseEditTutorComponent>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const activatedRouteStub = {
      queryParams: of({ name: 'Test Course', image: 'data:image/jpeg;base64,test-image-base64' })
    };

    await TestBed.configureTestingModule({
      declarations: [CourseEditTutorComponent],
      imports: [ReactiveFormsModule, RouterTestingModule, HttpClientTestingModule],
      providers: [
        FormBuilder,
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Incluye NO_ERRORS_SCHEMA
    }).compileComponents();

    fixture = TestBed.createComponent(CourseEditTutorComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with query parameters', () => {
    expect(component.courseForm.get('nombre')?.value).toBe('Test Course');
    expect(component.previewUrl).toContain('data:image/jpeg;base64'); // Ahora se espera un valor base64
  });

  it('should handle file selection', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } };

    component.onFileSelected(event as any);

    expect(component.selectedFile).toBe(file);
    expect(component.fileError).toBeNull();
    expect(component.previewUrl).toContain('data:image/jpeg;base64'); // Verifica que la vista previa esté configurada en base64
  });

  it('should set fileError on invalid file type', () => {
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    const event = { target: { files: [invalidFile] } };

    component.onFileSelected(event as any);

    expect(component.fileError).toBe('Por favor, selecciona un archivo con formato .jpg, .jpeg o .png');
    expect(component.selectedFile).toBeNull();
    expect(component.previewUrl).toBeNull();
  });

  it('should show success snackbar and navigate on valid form submission', () => {
    component.courseForm.setValue({
      nombre: 'Valid Course',
      descripcion: 'Descripción',
      portada: '/assets/test-image.jpg',
      dificultad: 'Beginner',
      estado: true,
      Categoria_id_categoria: 1
    });
    component.selectedFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

    component.onSubmit();

    expect(snackBar.open).toHaveBeenCalledWith('¡El curso se ha actualizado exitosamente!', 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
    expect(router.navigate).toHaveBeenCalledWith(['/my-courses']);
  });

  it('should show error snackbar and set fileError on invalid form submission', () => {
    component.courseForm.patchValue({
      nombre: '', // Campo requerido vacío
      Categoria_id_categoria: 0
    });
    component.selectedFile = null; // No se selecciona archivo

    component.onSubmit();

    expect(component.fileError).toBe('Por favor, selecciona una imagen válida para la portada del curso.');
    expect(snackBar.open).toHaveBeenCalledWith(
      'Error al actualizar el curso. Por favor, revisa los campos.',
      'Cerrar',
      { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['error-snackbar'] }
    );
  });

  it('should navigate to course details on cancel', () => {
    component.onCancel();
    expect(router.navigate).toHaveBeenCalledWith(['/course-details-tutor']);
  });

  it('should return correct error message for required field', () => {
    component.courseForm.get('nombre')?.setErrors({ required: true });
    expect(component.getErrorMessage('nombre')).toBe('Este campo es obligatorio.');
  });

  it('should return correct error message for max length', () => {
    component.courseForm.get('nombre')?.setErrors({ maxlength: { requiredLength: 150 } });
    expect(component.getErrorMessage('nombre')).toBe('Máximo 150 caracteres permitidos.');
  });

  it('should return correct error message for min value', () => {
    component.courseForm.get('Categoria_id_categoria')?.setErrors({ min: true });
    expect(component.getErrorMessage('Categoria_id_categoria')).toBe('El valor debe ser mayor que cero.');
  });
});
