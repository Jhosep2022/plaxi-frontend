import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemaDetailsTutorComponent } from './tema-details-tutor.component';

describe('TemaDetailsTutorComponent', () => {
  let component: TemaDetailsTutorComponent;
  let fixture: ComponentFixture<TemaDetailsTutorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TemaDetailsTutorComponent]
    });
    fixture = TestBed.createComponent(TemaDetailsTutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
