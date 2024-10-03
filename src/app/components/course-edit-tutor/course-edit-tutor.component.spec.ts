import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseEditTutorComponent } from './course-edit-tutor.component';

describe('CourseEditTutorComponent', () => {
  let component: CourseEditTutorComponent;
  let fixture: ComponentFixture<CourseEditTutorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseEditTutorComponent]
    });
    fixture = TestBed.createComponent(CourseEditTutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
