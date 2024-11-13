import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonDetailsTutorComponent } from './lesson-details-tutor.component';

describe('LessonDetailsTutorComponent', () => {
  let component: LessonDetailsTutorComponent;
  let fixture: ComponentFixture<LessonDetailsTutorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LessonDetailsTutorComponent]
    });
    fixture = TestBed.createComponent(LessonDetailsTutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
