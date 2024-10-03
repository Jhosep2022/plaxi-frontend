import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseCategoryListComponent } from './course-category-list.component';

describe('CourseCategoryListComponent', () => {
  let component: CourseCategoryListComponent;
  let fixture: ComponentFixture<CourseCategoryListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseCategoryListComponent]
    });
    fixture = TestBed.createComponent(CourseCategoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
