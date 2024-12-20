import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LessonFormComponent } from './lesson-form.component';
import { ActivatedRoute, Router } from '@angular/router';
import { LeccionService } from '../../services/leccion.service';
import { CourseService } from '../../services/course.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('LessonFormComponent', () => {
  let component: LessonFormComponent;
  let fixture: ComponentFixture<LessonFormComponent>;
  let mockRouter: any;
  let mockActivatedRoute: any;
  let mockLeccionService: any;
  let mockCourseService: any;
  let mockSnackBar: any;

  beforeEach(() => {
    mockRouter = { navigate: jasmine.createSpy('navigate') };
    mockActivatedRoute = { snapshot: { paramMap: { get: () => '1' } } };
    mockLeccionService = {
      createLeccion: jasmine.createSpy('createLeccion').and.returnValue(of({}))
    };
    mockCourseService = {
      getCursoById: jasmine.createSpy('getCursoById').and.returnValue(
        of({
          idCurso: 1,
          nombre: 'Curso de Prueba',
          descripcion: 'Descripción del curso',
          dificultad: 'Intermedio'
        })
      )
    };
    mockSnackBar = {
      open: jasmine.createSpy('open')
    };

    TestBed.configureTestingModule({
      declarations: [LessonFormComponent],
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: LeccionService, useValue: mockLeccionService },
        { provide: CourseService, useValue: mockCourseService },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ]
    });

    fixture = TestBed.createComponent(LessonFormComponent);
    component = fixture.componentInstance;

    // Mock para localStorage
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'idUsuario') return '123';
      return null;
    });

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load course details on initialization', () => {
    component.ngOnInit();
    expect(mockCourseService.getCursoById).toHaveBeenCalledWith(1);
    expect(component.course).toEqual(jasmine.objectContaining({ idCurso: 1, nombre: 'Curso de Prueba' }));
  });

  it('should call createLeccion on submit when form is valid', () => {
    component.lessonForm.patchValue({
      nombre: 'Lección de Prueba',
      contenido: 'Contenido de la lección',
      duracion: 60,
      orden: 1,
      estado: true
    });

    component.onSubmit();
    expect(mockLeccionService.createLeccion).toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      '¡La lección se ha creado exitosamente!',
      'Cerrar',
      jasmine.objectContaining({ panelClass: ['success-snackbar'] })
    );
  });

  it('should show error if form is invalid on submit', () => {
    // Simula un formulario inválido
    component.lessonForm.patchValue({
      nombre: '',
      contenido: '',
      duracion: 0,
      orden: 0,
      estado: false
    });

    component.onSubmit();
    expect(mockLeccionService.createLeccion).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Error al crear la lección. Por favor, revisa los campos.',
      'Cerrar',
      jasmine.objectContaining({ panelClass: ['error-snackbar'] })
    );
  });


});
