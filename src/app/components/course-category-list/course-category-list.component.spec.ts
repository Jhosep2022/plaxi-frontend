import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseCategoryListComponent } from './course-category-list.component';
import { CourseService } from 'src/app/services/course.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CourseCategoryListComponent', () => {
  let component: CourseCategoryListComponent;
  let fixture: ComponentFixture<CourseCategoryListComponent>;
  let courseService: jasmine.SpyObj<CourseService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const courseServiceSpy = jasmine.createSpyObj('CourseService', ['getAllCursos']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [CourseCategoryListComponent],
      imports: [HttpClientTestingModule], // Para probar el servicio
      providers: [
        { provide: CourseService, useValue: courseServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseCategoryListComponent);
    component = fixture.componentInstance;
    courseService = TestBed.inject(CourseService) as jasmine.SpyObj<CourseService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock de los datos devueltos por el servicio
    courseService.getAllCursos.and.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getCoursesFromApi on init', () => {
    component.ngOnInit();
    expect(courseService.getAllCursos).toHaveBeenCalled();
  });

  it('should navigate to course details when viewCourse is called', () => {
    const course = { idCurso: 1 } as any; // Ajusta según el tipo `CursoDto`
    component.viewCourse(course);
    expect(router.navigate).toHaveBeenCalledWith(['/course-details', course.idCurso]);
  });
});
