import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CourseDetailsTutorComponent } from './course-details-tutor.component';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CourseDetailsTutorComponent', () => {
  let component: CourseDetailsTutorComponent;
  let fixture: ComponentFixture<CourseDetailsTutorComponent>;
  let router: jasmine.SpyObj<Router>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const activatedRouteStub = {
      queryParams: of({
        id: 1,
        name: 'Course Test',
        date: '2023-12-01',
        time: '10:00 AM',
        studentsEnrolled: 25,
        image: 'test-image.jpg'
      })
    };

    await TestBed.configureTestingModule({
      declarations: [CourseDetailsTutorComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ],
      imports: [RouterTestingModule, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(CourseDetailsTutorComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize course details from route params', () => {
    expect(component.course).toEqual({
      id: 1,
      name: 'Course Test',
      date: '2023-12-01',
      time: '10:00 AM',
      studentsEnrolled: 25,
      image: 'test-image.jpg'
    });
  });

  it('should navigate back to my-courses on goBack', () => {
    component.goBack();
    expect(router.navigate).toHaveBeenCalledWith(['/my-courses']);
  });

  it('should navigate to edit course view with correct query params on editCourse', () => {
    component.editCourse();
    expect(router.navigate).toHaveBeenCalledWith(['/course-edit-tutor'], {
      queryParams: {
        id: component.course.id,
        name: component.course.name,
        date: component.course.date,
        time: component.course.time,
        studentsEnrolled: component.course.studentsEnrolled,
        image: component.course.image
      }
    });
  });

  it('should display a snackbar and navigate to my-courses on deleteCourse', () => {
    spyOn(window, 'confirm').and.returnValue(true); // Simula confirmación de eliminación

    component.deleteCourse();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Curso eliminado exitosamente',
      'Cerrar',
      {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      }
    );
    expect(router.navigate).toHaveBeenCalledWith(['/my-courses']);
  });
});
