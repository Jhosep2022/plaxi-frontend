import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SessionService } from '../../../../core/auth/session.service';
import { PeopleImportApi } from './import-api.service';
import { createImportTemplate } from './import-workbook';
import { PeopleImportComponent } from './people-import.component';

describe('People import review', () => {
  const review = {
    valid: true,
    rows: [],
    globalErrors: [],
    summary: { rows: 1, newPeople: 1, existingPeople: 0 },
    version: 'a'.repeat(64),
  };
  let api: jasmine.SpyObj<PeopleImportApi>;
  beforeEach(() => {
    api = jasmine.createSpyObj('PeopleImportApi', [
      'years',
      'groups',
      'preview',
      'confirm',
      'job',
      'access',
    ]);
    api.years.and.returnValue(of([{ id: 12, anio: 2027, estado: 'activa' }]));
    api.groups.and.returnValue(of([]));
    api.preview.and.returnValue(of(review));
    TestBed.configureTestingModule({
      imports: [PeopleImportComponent],
      providers: [
        provideRouter([]),
        { provide: PeopleImportApi, useValue: api },
        {
          provide: SessionService,
          useValue: {
            userId: () => 9999,
            activeSpace: () => ({ id: 9999 }),
            roleRoute: () => '/',
          },
        },
      ],
    });
    localStorage.removeItem('aulix-import:9999:9999');
  });
  afterEach(() => localStorage.removeItem('aulix-import:9999:9999'));
  it('uploads for review without creating a job, then preserves the retry key after a server error', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    await component.upload(
      new File([await createImportTemplate([], 2027)], 'Plantilla.xlsx'),
    );
    fixture.detectChanges();
    expect(api.preview).toHaveBeenCalled();
    expect(api.confirm).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Ninguna persona se ha guardado todavía',
    );
    api.confirm.and.returnValue(throwError(() => ({ status: 500 })));
    await component.confirm();
    await component.confirm();
    expect(api.confirm.calls.count()).toBe(2);
    expect(api.confirm.calls.argsFor(0)[2]).toBe(
      api.confirm.calls.argsFor(1)[2],
    );
    expect(component.preview()).toEqual(review);
    expect(component.workbook()).not.toBeNull();
    fixture.destroy();
  });
  it('keeps an invalid review blocked before any server mutation', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    component.preview.set({
      ...review,
      valid: false,
      globalErrors: ['El paralelo no existe.'],
    });
    component.workbook.set({
      yearId: 12,
      students: [],
      teachers: [],
      parents: [],
    });
    fixture.detectChanges();
    await component.confirm();
    expect(api.confirm).not.toHaveBeenCalled();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (entry: HTMLButtonElement) =>
        entry.textContent?.includes('Confirmar carga'),
    );
    expect(button.disabled).toBeTrue();
    fixture.destroy();
  });
});
