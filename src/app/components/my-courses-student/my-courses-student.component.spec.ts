import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyCoursesStudentComponent } from './my-courses-student.component';
import { Router } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('MyCoursesStudentComponent', () => {
  let component: MyCoursesStudentComponent;
  let fixture: ComponentFixture<MyCoursesStudentComponent>;
  let mockRouter: any;
  let mockInscripcionService: any;
  let mockSnackBar: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    mockInscripcionService = {
      getInscripcionesByUsuarioId: jasmine.createSpy('getInscripcionesByUsuarioId')
    };

    mockSnackBar = {
      open: jasmine.createSpy('open')
    };

    await TestBed.configureTestingModule({
      declarations: [MyCoursesStudentComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: InscripcionService, useValue: mockInscripcionService },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Ignorar errores de elementos desconocidos (útil para simplificar el componente en pruebas)
    }).compileComponents();

    fixture = TestBed.createComponent(MyCoursesStudentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load courses on initialization', () => {
    const mockInscripciones = [
      { cursoId: 1, cursoNombre: 'Curso 1', fechaInscripcion: '2023-11-01' },
      { cursoId: 2, cursoNombre: 'Curso 2', fechaInscripcion: '2023-11-02' }
    ];

    mockInscripcionService.getInscripcionesByUsuarioId.and.returnValue(of(mockInscripciones));

    component.ngOnInit();

    expect(mockInscripcionService.getInscripcionesByUsuarioId).toHaveBeenCalledWith(component.userId);
    expect(component.courses.length).toBe(2);
    expect(component.courses[0].name).toBe('Curso 1');
  });

  it('should show an error message if loading courses fails', () => {
    mockInscripcionService.getInscripcionesByUsuarioId.and.returnValue(throwError('Error al cargar inscripciones'));

    component.ngOnInit();

    expect(mockSnackBar.open).toHaveBeenCalledWith(
      'Error al cargar los cursos. Por favor, inténtalo de nuevo más tarde.',
      'Cerrar',
      {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      }
    );
  });

  it('should navigate to course details when openCourse is called', () => {
    const course = { id: 1, name: 'Curso 1', date: '2023-11-01', time: '10:00 AM', studentsEnrolled: 30, image: 'assets/curso.png' };

    component.openCourse(course);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/course-details', course.id]);
  });

  it('should navigate to create course form when openCourseForm is called', () => {
    component.openCourseForm();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/create-course']);
  });
});
