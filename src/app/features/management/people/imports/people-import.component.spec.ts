import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Workbook } from 'exceljs';
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
  async function fileWithFiveStudents(): Promise<File> {
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate([], 2027));
    for (let index = 0; index < 5; index++)
      book.getWorksheet('Estudiantes')!.getRow(index + 2).values = [
        'Persona ' + index,
        'Prueba',
        '',
        String(90000000 + index),
        '',
        '',
        '2018-02-20',
        'primaria',
        '1',
        'A',
        'manana',
      ];
    return new File(
      [(await book.xlsx.writeBuffer()) as ArrayBuffer],
      'Cinco-personas.xlsx',
    );
  }
  it('retains the uploaded people when preview fails and retries without uploading again', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    api.preview.and.returnValue(throwError(() => ({ status: 500 })));
    await component.upload(await fileWithFiveStudents());
    expect(component.workbook()!.students.length).toBe(5);
    expect(component.filename()).toBe('Cinco-personas.xlsx');
    expect(component.reviewPending()).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reintentar revisión');
    api.preview.and.returnValue(of(review));
    await component.retryReview();
    expect(component.reviewPending()).toBeFalse();
    expect(api.preview.calls.mostRecent().args[0].students.length).toBe(5);
    expect(api.confirm).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('preserves the workbook when changing the destination year and rechecks every row', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    await component.upload(await fileWithFiveStudents());
    const original = structuredClone(component.workbook()!.students);
    await component.selectYear('13');
    expect(component.workbook()!.students).toEqual(original);
    expect(component.filename()).toBe('Cinco-personas.xlsx');
    expect(api.preview.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({ yearId: 13, students: original }),
    );
    expect(api.confirm).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('corrects one row using the form and keeps the other four people untouched', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    api.preview.and.callFake((input) =>
      of({
        ...review,
        rows: input.students.map((person, index) => ({
          kind: 'student' as const,
          row: index + 2,
          person: {
            nombres: String(person['nombres']),
            primerApellido: String(person['primerApellido']),
            ci: String(person['ci']),
          },
          action: 'create' as const,
          errors:
            index === 0 && person['nombres'] !== 'Nombre corregido'
              ? ['Revisa el nombre.']
              : [],
        })),
      }),
    );
    await component.upload(await fileWithFiveStudents());
    const original = structuredClone(component.workbook());
    component.editRow(component.preview()!.rows[0]);
    fixture.detectChanges();
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('app-drawer input');
    input.value = 'Nombre corregido';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await component.reviewEdits();
    fixture.detectChanges();
    expect(component.workbook()!.students[0]['nombres']).toBe(
      'Nombre corregido',
    );
    expect(component.workbook()!.students.slice(1)).toEqual(
      original!.students.slice(1),
    );
    expect(component.preview()!.rows[0].errors).toEqual([]);
    expect(component.hasEdits()).toBeTrue();
    expect(component.editing()).toBeNull();
    expect(api.confirm).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
