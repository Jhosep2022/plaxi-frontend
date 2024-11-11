import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseDetailsComponent } from './course-details.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from 'src/app/services/course.service';
import { InscripcionService } from 'src/app/services/inscripcion.service';
import { LeccionService } from 'src/app/services/leccion.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CourseDetailsComponent', () => {
  let component: CourseDetailsComponent;
  let fixture: ComponentFixture<CourseDetailsComponent>;
  let courseService: jasmine.SpyObj<CourseService>;
  let inscripcionService: jasmine.SpyObj<InscripcionService>;
  let leccionService: jasmine.SpyObj<LeccionService>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const courseServiceSpy = jasmine.createSpyObj('CourseService', ['getCursoById']);
    const inscripcionServiceSpy = jasmine.createSpyObj('InscripcionService', ['createInscripcion']);
    const leccionServiceSpy = jasmine.createSpyObj('LeccionService', ['getLeccionesByCurso']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const activatedRouteStub = { snapshot: { paramMap: { get: () => '1' } } };

    await TestBed.configureTestingModule({
      declarations: [CourseDetailsComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: InscripcionService, useValue: inscripcionServiceSpy },
        { provide: LeccionService, useValue: leccionServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseDetailsComponent);
    component = fixture.componentInstance;
    courseService = TestBed.inject(CourseService) as jasmine.SpyObj<CourseService>;
    inscripcionService = TestBed.inject(InscripcionService) as jasmine.SpyObj<InscripcionService>;
    leccionService = TestBed.inject(LeccionService) as jasmine.SpyObj<LeccionService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    // Mocks para datos simulados
    courseService.getCursoById.and.returnValue(of({ idCurso: 1, nombre: 'Curso de Prueba' } as any));
    leccionService.getLeccionesByCurso.and.returnValue(of({ content: [] }));
    inscripcionService.createInscripcion.and.returnValue(of({
      idInscripcion: 1,
      fechaInscripcion: '2024-11-11',
      estadoInscripcion: 'Activo',
      usuarioId: 1,
      usuarioNombre: 'John Doe',
      usuarioGmail: 'johndoe@example.com',
      cursoId: 101,
      cursoNombre: 'Curso 1',
      usuarioCreadorId: 5,
    }));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load course details on init', () => {
    component.ngOnInit();
    expect(courseService.getCursoById).toHaveBeenCalledWith(1);
  });

  it('should enroll in the course', () => {
    component.course = { idCurso: 1 } as any; // Ajusta según la estructura de CursoDto
    component.userId = 1;
    component.enrollInCourse();
    expect(inscripcionService.createInscripcion).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      '¡Te has inscrito en el curso exitosamente!',
      'Cerrar',
      jasmine.any(Object)
    );
  });

  it('should navigate to lesson details', () => {
    component.lessonDetails(1);
    expect(router.navigate).toHaveBeenCalledWith(['/crear-tema', 1]);
  });

  it('should go back to course categories', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/course-categories']);
  });
});
