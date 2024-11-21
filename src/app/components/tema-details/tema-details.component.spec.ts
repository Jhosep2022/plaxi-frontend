import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemaDetailsComponent } from './tema-details.component';

describe('TemaDetailsComponent', () => {
  let component: TemaDetailsComponent;
  let fixture: ComponentFixture<TemaDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TemaDetailsComponent]
    });
    fixture = TestBed.createComponent(TemaDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
