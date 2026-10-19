import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuccessDialogComponent } from './success-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('SuccessDialogComponent', () => {
  let component: SuccessDialogComponent;
  let fixture: ComponentFixture<SuccessDialogComponent>;
  let mockDialogRef: any;

  beforeEach(async () => {
    // Mock de MatDialogRef
    mockDialogRef = {
      close: jasmine.createSpy('close')
    };

    await TestBed.configureTestingModule({
    declarations: [SuccessDialogComponent],
    schemas: [NO_ERRORS_SCHEMA] // Ignora errores relacionados con plantillas externas
    ,
    imports: [],
    providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { message: 'Operation successful!' } },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
}).compileComponents();

    fixture = TestBed.createComponent(SuccessDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the message passed in data', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Operation successful!');
  });

  it('should close the dialog when onClose is called', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});
