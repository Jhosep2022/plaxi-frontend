import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseDetailsTutorComponent } from './course-details-tutor.component';

describe('CourseDetailsTutorComponent', () => {
  let component: CourseDetailsTutorComponent;
  let fixture: ComponentFixture<CourseDetailsTutorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseDetailsTutorComponent]
    });
    fixture = TestBed.createComponent(CourseDetailsTutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
