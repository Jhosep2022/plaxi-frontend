import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemaFormComponent } from './tema-form.component';

describe('TemaFormComponent', () => {
  let component: TemaFormComponent;
  let fixture: ComponentFixture<TemaFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TemaFormComponent]
    });
    fixture = TestBed.createComponent(TemaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
