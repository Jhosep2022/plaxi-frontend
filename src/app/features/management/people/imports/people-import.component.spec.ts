import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { Workbook } from 'exceljs';
import { SessionService } from '../../../../core/auth/session.service';
import { PeopleImportApi, type ImportPreview, type ImportJob, type ImportWorkbook } from './import-api.service';
import { createImportTemplate } from './import-workbook';
import { PeopleImportComponent } from './people-import.component';

describe('People import review', () => {
  const summary = { rows: 1, ready: 1, withErrors: 0, withWarnings: 0, newPeople: 1, existingPeople: 0 };
  const review: ImportPreview = { valid: true, rows: [], globalErrors: [], summary, version: 'a'.repeat(64) };
  // The server answer for a workbook: the first student has a course that does not exist
  const reviewWithOneError = (input: ImportWorkbook): ImportPreview => ({
    ...review,
    summary: { ...summary, rows: input.students.length, ready: input.students.length - 1, withErrors: 1 },
    rows: input.students.map((person, index) => ({
      kind: 'student' as const,
      row: Number(person['_row']),
      person: { nombres: String(person['nombres']), primerApellido: String(person['primerApellido']), ci: String(person['ci']) },
      action: 'create' as const,
      errors: index === 0 && person['curso'] !== '1° Primaria A · Mañana' ? ['No encontramos el curso.'] : [],
      warnings: index === 1 ? ['El celular no es válido; se guarda sin celular.'] : [],
    })),
  });
  let api: jasmine.SpyObj<PeopleImportApi>;
  beforeEach(() => {
    api = jasmine.createSpyObj('PeopleImportApi', ['years', 'groups', 'preview', 'confirm', 'job', 'access']);
    api.years.and.returnValue(of([{ id: 12, anio: 2027, estado: 'activa' }]));
    api.groups.and.returnValue(of([{ nivel: 'primaria', grado: 1, letra: 'A', turno: 'manana', capacidad: 40, estudiantes: 0 }]));
    api.preview.and.returnValue(of(review));
    TestBed.configureTestingModule({
      imports: [PeopleImportComponent],
      providers: [
        provideRouter([]),
        { provide: PeopleImportApi, useValue: api },
        { provide: SessionService, useValue: { userId: () => 9999, activeSpace: () => ({ id: 9999 }), roleRoute: () => '/' } },
      ],
    });
    localStorage.removeItem('aulix-import:9999:9999');
  });
  afterEach(() => localStorage.removeItem('aulix-import:9999:9999'));

  async function fileWithFiveStudents(): Promise<File> {
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate([], 2027));
    for (let index = 0; index < 5; index++)
      book.getWorksheet('Estudiantes')!.getRow(index + 2).values = [
        'Persona ' + index,
        'Prueba',
        '',
        String(90000000 + index),
        index === 0 ? '9° Z' : '1° Primaria A · Mañana',
      ];
    return new File([(await book.xlsx.writeBuffer()) as ArrayBuffer], 'Cinco-personas.xlsx');
  }
  const waitFor = async (condition: () => boolean) => {
    for (let attempt = 0; attempt < 200 && !condition(); attempt++) await new Promise((resolve) => setTimeout(resolve, 10));
  };

  it('shows the progress through reading, review, sending and the background save', async () => {
    const pendingReview = new Subject<ImportPreview>();
    api.preview.and.returnValue(pendingReview);
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    const uploading = component.upload(await fileWithFiveStudents());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Leyendo tu Excel');
    await waitFor(() => api.preview.calls.count() > 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Revisando 5 filas');
    pendingReview.next(review);
    pendingReview.complete();
    await uploading;
    const pendingConfirmation = new Subject<ImportJob>();
    api.confirm.and.returnValue(pendingConfirmation);
    const completed: ImportJob = {
      id: 'job-loader',
      status: 'completed',
      error: null,
      accessAvailable: false,
      result: { created: 5, existing: 0, links: 0, skipped: 0, accessCount: 0 },
    };
    const worker = new BehaviorSubject<ImportJob>({ ...completed, status: 'queued', result: null });
    api.job.and.returnValue(worker);
    const confirming = component.confirm();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enviando la carga');
    pendingConfirmation.next(completed);
    pendingConfirmation.complete();
    await confirming;
    await waitFor(() => component.job.hasValue());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Guardando personas');
    expect(fixture.nativeElement.querySelector('.barra')).not.toBeNull();
    worker.next(completed);
    component.job.reload();
    await waitFor(() => component.job.value()?.status === 'completed');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Carga guardada');
    expect(fixture.nativeElement.querySelector('.barra')).toBeNull();
    fixture.destroy();
  });

  it('lets the school save the correct rows while others still have errors, and fix those afterwards', async () => {
    api.preview.and.callFake((input: ImportWorkbook) => of(reviewWithOneError(input)));
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    await component.upload(await fileWithFiveStudents());
    fixture.detectChanges();
    expect(component.errorCount()).toBe(1);
    expect(component.warningCount()).toBe(1);
    const save = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) =>
      button.textContent?.includes('Guardar 4 personas'),
    ) as HTMLButtonElement;
    expect(save.disabled).toBeFalse();
    api.confirm.and.returnValue(
      of({ id: 'job-1', status: 'queued', error: null, accessAvailable: false, result: null } as ImportJob),
    );
    api.job.and.returnValue(
      of({
        id: 'job-1',
        status: 'completed',
        error: null,
        accessAvailable: false,
        result: { created: 4, existing: 0, links: 0, skipped: 1, accessCount: 0 },
      } as ImportJob),
    );
    await component.confirm();
    expect(api.confirm.calls.mostRecent().args[0].students.length).toBe(5);
    expect(component.pending()!.students.map((row) => row['ci'])).toEqual(['90000000']);
    await waitFor(() => component.job.hasValue());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Quedan 1 filas por corregir');
    await component.fixPending();
    expect(api.preview.calls.mostRecent().args[0].students.map((row: Record<string, unknown>) => row['ci'])).toEqual(['90000000']);
    expect(component.preview()!.rows[0].errors.length).toBe(1);
    fixture.destroy();
  });

  it('uploads for review without creating a job, then preserves the retry key after a server error', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    await component.upload(await fileWithFiveStudents());
    fixture.detectChanges();
    expect(api.preview).toHaveBeenCalled();
    expect(api.confirm).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Todavía no se guardó nadie');
    api.confirm.and.returnValue(throwError(() => ({ status: 500 })));
    await component.confirm();
    await component.confirm();
    expect(api.confirm.calls.count()).toBe(2);
    expect(api.confirm.calls.argsFor(0)[2]).toBe(api.confirm.calls.argsFor(1)[2]);
    expect(component.preview()).toEqual(review);
    expect(component.workbook()).not.toBeNull();
    fixture.destroy();
  });

  it('keeps the save button off when nothing can be saved', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    component.preview.set({ ...review, valid: false, globalErrors: ['Selecciona una gestión existente.'] });
    component.workbook.set({ yearId: 12, students: [], teachers: [], parents: [] });
    fixture.detectChanges();
    await component.confirm();
    expect(api.confirm).not.toHaveBeenCalled();
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((entry: HTMLButtonElement) =>
      entry.textContent?.includes('Guardar'),
    );
    expect(button.disabled).toBeTrue();
    fixture.destroy();
  });

  it('retains the uploaded people when preview fails and retries without uploading again', async () => {
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    api.preview.and.returnValue(throwError(() => ({ status: 500 })));
    await component.upload(await fileWithFiveStudents());
    expect(component.workbook()!.students.length).toBe(5);
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
    expect(api.preview.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ yearId: 13, students: original }));
    expect(api.confirm).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it('fixes the course of one row from the list and keeps the other four people untouched', async () => {
    api.preview.and.callFake((input: ImportWorkbook) => of(reviewWithOneError(input)));
    const fixture = TestBed.createComponent(PeopleImportComponent);
    const component = fixture.componentInstance;
    component.yearId.set(12);
    fixture.detectChanges();
    await component.upload(await fileWithFiveStudents());
    const original = structuredClone(component.workbook());
    component.editRow(component.preview()!.rows[0]);
    fixture.detectChanges();
    const course: HTMLSelectElement = fixture.nativeElement.querySelector('app-drawer select');
    course.value = '1° Primaria A · Mañana';
    course.dispatchEvent(new Event('input', { bubbles: true }));
    course.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await component.reviewEdits();
    expect(component.workbook()!.students[0]['curso']).toBe('1° Primaria A · Mañana');
    expect(component.workbook()!.students.slice(1)).toEqual(original!.students.slice(1));
    expect(component.preview()!.rows[0].errors).toEqual([]);
    expect(component.editing()).toBeNull();
    expect(api.confirm).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
