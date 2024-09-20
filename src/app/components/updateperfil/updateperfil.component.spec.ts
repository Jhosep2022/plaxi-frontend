import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateperfilComponent } from './updateperfil.component';

describe('UpdateperfilComponent', () => {
  let component: UpdateperfilComponent;
  let fixture: ComponentFixture<UpdateperfilComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UpdateperfilComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateperfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
