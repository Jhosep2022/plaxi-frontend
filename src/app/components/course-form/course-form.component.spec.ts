import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseFormComponent } from './course-form.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CourseService } from 'src/app/services/course.service';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CourseFormComponent', () => {
  let component: CourseFormComponent;
  let fixture: ComponentFixture<CourseFormComponent>;
  let categoriaService: jasmine.SpyObj<CategoriaService>;
  let courseService: jasmine.SpyObj<CourseService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const categoriaServiceSpy = jasmine.createSpyObj('CategoriaService', ['getAllCategorias']);
    const courseServiceSpy = jasmine.createSpyObj('CourseService', ['createCurso']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [CourseFormComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule, BrowserAnimationsModule],
      providers: [
        FormBuilder,
        { provide: CategoriaService, useValue: categoriaServiceSpy },
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseFormComponent);
    component = fixture.componentInstance;
    categoriaService = TestBed.inject(CategoriaService) as jasmine.SpyObj<CategoriaService>;
    courseService = TestBed.inject(CourseService) as jasmine.SpyObj<CourseService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    // Mock de carga de categorías
    categoriaService.getAllCategorias.and.returnValue(of([{ idCategoria: 1, nombre: 'Test Category', descripcion: 'Test Description' }]));

    // Mock de localStorage para ID de usuario
    spyOn(localStorage, 'getItem').and.returnValue('123');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load categories on initialization', () => {
    expect(component.categorias.length).toBe(1);
    expect(component.categorias[0].nombre).toBe('Test Category');
  });

  it('should handle file selection and set preview', () => {
    const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } };
    component.onFileSelected(event as any);

    expect(component.selectedFile).toBe(file);
    expect(component.fileError).toBeNull();
    expect(component.previewUrl).not.toBeNull();
  });

  it('should show error on invalid file type', () => {
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    const event = { target: { files: [invalidFile] } };
    component.onFileSelected(event as any);

    expect(component.fileError).toBe('Por favor, selecciona un archivo con formato .jpg, .jpeg o .png');
    expect(component.selectedFile).toBeNull();
  });

  it('should submit form with valid data', () => {
    component.courseForm.setValue({
      nombre: 'Test Course',
      descripcion: 'Test Description',
      dificultad: 'Beginner',
      estado: true,
      Categoria_id_categoria: 1,
    });
    component.selectedFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    component.userId = 123;

    courseService.createCurso.and.returnValue(of({}));

    component.onSubmit();

    expect(snackBar.open).toHaveBeenCalledWith(
      '¡El curso se ha creado exitosamente!', 'Cerrar', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['success-snackbar'] }
    );
    expect(router.navigate).toHaveBeenCalledWith(['/my-courses']);
  });

  it('should show error if form is invalid on submit', () => {
    component.onSubmit();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Error al crear el curso. Por favor, revisa los campos.', 'Cerrar', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top', panelClass: ['error-snackbar'] }
    );
  });

  it('should navigate back on cancel', () => {
    component.onCancel();
    expect(router.navigate).toHaveBeenCalledWith(['/my-courses']);
  });

  it('should return correct error message for required field', () => {
    component.courseForm.get('nombre')?.setErrors({ required: true });
    expect(component.getErrorMessage('nombre')).toBe('Este campo es obligatorio.');
  });

  it('should return correct error message for max length', () => {
    component.courseForm.get('nombre')?.setErrors({ maxlength: { requiredLength: 150 } });
    expect(component.getErrorMessage('nombre')).toBe('Máximo 150 caracteres permitidos.');
  });
});
