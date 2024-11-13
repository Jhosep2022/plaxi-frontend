import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseListComponent } from './course-list.component';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { CourseService } from 'src/app/services/course.service';
import { of, throwError } from 'rxjs';
import { CursoDto } from 'src/app/models/CursoDto';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CourseListComponent', () => {
  let component: CourseListComponent;
  let fixture: ComponentFixture<CourseListComponent>;
  let mockRouter: any;
  let mockAuthService: any;
  let mockCourseService: any;

  beforeEach(() => {
    mockAuthService = {
      getCurrentUserId: jasmine.createSpy('getCurrentUserId').and.returnValue(1)
    };

    mockCourseService = {
      getCursosByUsuario: jasmine.createSpy('getCursosByUsuario').and.returnValue(
        of([
          { idCurso: 1, nombre: 'Curso 1', descripcion: 'Descripción 1', dificultad: 'Beginner', estado: true, categoriaId: 1, portada: '/assets/test-image.jpg' },
          { idCurso: 2, nombre: 'Curso 2', descripcion: 'Descripción 2', dificultad: 'Intermediate', estado: true, categoriaId: 2, portada: '/assets/test-image.jpg' }
        ] as CursoDto[])
      )
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    // Mock para localStorage
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'idUsuario') return '1'; // Simula el ID de usuario como 1
      return null;
    });

    TestBed.configureTestingModule({
      declarations: [CourseListComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CourseService, useValue: mockCourseService },
        { provide: Router, useValue: mockRouter }
      ],
      schemas: [NO_ERRORS_SCHEMA] // Incluye NO_ERRORS_SCHEMA
    });

    fixture = TestBed.createComponent(CourseListComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load courses by user on initialization', () => {
    component.ngOnInit();
    expect(mockCourseService.getCursosByUsuario).toHaveBeenCalledWith(1);
    expect(component.courses.length).toBe(2);
    expect(component.courses[0].nombre).toBe('Curso 1');
  });

  it('should navigate to course details', () => {
    const course: CursoDto = { idCurso: 1, nombre: 'Curso 1', descripcion: 'Descripción 1', dificultad: 'Beginner', estado: true, categoriaId: 1, portada: 'image1.png' };
    component.openCourse(course);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/course-details-tutor'], {
      queryParams: {
        id: course.idCurso,
        name: course.nombre,
        description: course.descripcion,
        difficulty: course.dificultad,
        image: course.portada
      }
    });
  });

  it('should navigate to create course form', () => {
    component.openCourseForm();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/create-course']);
  });

  it('should handle error when loading courses', () => {
    mockCourseService.getCursosByUsuario.and.returnValue(throwError('Error loading courses'));
    spyOn(console, 'error');
    component.ngOnInit();
    expect(console.error).toHaveBeenCalledWith('Error al cargar los cursos del usuario:', 'Error loading courses');
  });
});
