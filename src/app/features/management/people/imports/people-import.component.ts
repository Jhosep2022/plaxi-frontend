import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../../core/auth/session.service';
import { readApiError } from '../../../../core/api/api-error';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import {
  PeopleImportApi,
  type ImportPreview,
  type ImportWorkbook,
  type ImportPreviewRow,
} from './import-api.service';
import {
  createImportTemplate,
  createReviewedWorkbook,
  downloadFile,
  readImportDraft,
  importColumns,
  importSheetKey,
  normalizeImportValue,
  type ImportCellIssue,
  safeCsvCell,
} from './import-workbook';

@Component({
  selector: 'app-people-import',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, RouterLink, DrawerComponent, FormField],
  templateUrl: './people-import.component.html',
  styleUrl: './people-import.component.css',
})
export class PeopleImportComponent {
  private readonly api = inject(PeopleImportApi);
  readonly session = inject(SessionService);
  private readonly destroy = inject(DestroyRef);
  readonly years = rxResource({
    stream: () => this.api.years(),
    defaultValue: [],
  });
  readonly yearId = signal<number | undefined>(undefined);
  readonly groups = rxResource({
    params: () => this.yearId(),
    stream: ({ params }) => this.api.groups(params),
    defaultValue: [],
  });
  readonly jobId = signal<string | null>(this.restoreJob());
  readonly job = rxResource({
    params: () => this.jobId() ?? undefined,
    stream: ({ params }) => this.api.job(params),
  });
  readonly selectedYear = computed(() =>
    this.years.value().find((year) => year.id === this.yearId()),
  );
  readonly preview = signal<ImportPreview | null>(null);
  readonly workbook = signal<ImportWorkbook | null>(null);
  readonly filename = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly cellIssues = signal<ImportCellIssue[]>([]);
  readonly reviewPending = signal(false);
  readonly hasEdits = signal(false);
  readonly editing = signal<ImportPreviewRow | null>(null);
  readonly editorValues = signal<
    { key: string; label: string; text: string }[]
  >([]);
  readonly editorForm = form(this.editorValues);
  readonly courseFields = ['nivel', 'grado', 'letra', 'turno'];
  readonly selectedCourse = computed(() => {
    const values = Object.fromEntries(
      this.editorValues().map((field) => [field.key, field.text]),
    );
    const index = this.groups
      .value()
      .findIndex((group) =>
        this.courseFields.every(
          (key) => String(group[key as keyof typeof group]) === values[key],
        ),
      );
    return index < 0 ? '' : String(index);
  });
  readonly errorCount = computed(
    () => this.preview()?.rows.filter((row) => row.errors.length).length ?? 0,
  );
  readonly showErrorsOnly = signal(false);
  readonly visibleRows = computed(
    () =>
      this.preview()?.rows.filter(
        (row) => !this.showErrorsOnly() || row.errors.length,
      ) ?? [],
  );
  readonly queued = computed(
    () =>
      !!this.jobId() &&
      !this.job.error() &&
      (!this.job.hasValue() || this.job.value()?.status === 'queued'),
  );
  readonly accessDownloaded = signal(false);
  private requestId = crypto.randomUUID();
  readonly labels = {
    student: 'Estudiantes',
    teacher: 'Docentes',
    parent: 'Padres',
  };
  constructor() {
    effect(() => {
      if (this.yearId() === undefined && this.years.hasValue())
        this.yearId.set(
          this.years.value().find((year) => year.estado === 'activa')?.id ??
            this.years.value().find((year) => year.estado !== 'cerrada')?.id,
        );
    });
    const timer = setInterval(() => {
      if (this.queued() && !this.job.isLoading()) this.job.reload();
    }, 2000);
    this.destroy.onDestroy(() => clearInterval(timer));
  }
  async selectYear(value: string): Promise<void> {
    if (this.busy() || this.queued()) return;
    const yearId = Number(value),
      workbook = this.workbook();
    if (!Number.isInteger(yearId) || yearId <= 0) return;
    this.yearId.set(yearId);
    this.error.set('');
    this.editing.set(null);
    if (workbook) {
      this.workbook.set({ ...workbook, yearId });
      this.reviewPending.set(true);
      this.hasEdits.set(true);
      this.requestId = crypto.randomUUID();
      await this.retryReview();
      return;
    }
    this.preview.set(null);
    this.workbook.set(null);
    this.filename.set('');
    this.cellIssues.set([]);
    this.reviewPending.set(false);
    this.hasEdits.set(false);
  }
  async template(): Promise<void> {
    if (!this.selectedYear() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      downloadFile(
        await createImportTemplate(
          this.groups.value(),
          this.selectedYear()!.anio,
        ),
        `Plantilla-Aulix-${this.selectedYear()!.anio}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'No se pudo crear la plantilla.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  async upload(file: File | undefined): Promise<void> {
    if (!file || !this.yearId() || this.busy() || this.queued()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      if (
        !file.name.toLowerCase().endsWith('.xlsx') ||
        file.size > 3 * 1024 * 1024
      )
        throw new Error('Elige una plantilla .xlsx de hasta 3 MB.');
      const draft = await readImportDraft(
        await file.arrayBuffer(),
        this.yearId()!,
      );
      this.workbook.set(draft.workbook);
      this.cellIssues.set(draft.issues);
      this.preview.set(null);
      this.reviewPending.set(true);
      this.filename.set(file.name);
      this.showErrorsOnly.set(false);
      this.requestId = crypto.randomUUID();
      this.jobId.set(null);
      this.storeJob(null);
      this.accessDownloaded.set(false);
      this.hasEdits.set(false);
      this.editing.set(null);
      await this.reviewWorkbook();
    } catch (error) {
      this.error.set(
        error instanceof Error && !('status' in error)
          ? error.message
          : readApiError(error).message,
      );
    } finally {
      this.busy.set(false);
    }
  }
  async retryReview(): Promise<void> {
    if (this.busy() || !this.workbook()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.reviewWorkbook();
    } catch (error) {
      this.error.set(readApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
  editRow(row: ImportPreviewRow): void {
    if (this.busy() || this.queued()) return;
    const source = this.workbook()?.[importSheetKey(row.kind)].find(
      (entry, index) => Number(entry['_row'] ?? index + 2) === row.row,
    );
    if (!source) return;
    this.editorValues.set(
      importColumns(row.kind).map(([label, key]) => ({
        key,
        label,
        text: String(source[key] ?? ''),
      })),
    );
    this.editing.set(row);
  }
  selectCourse(index: string): void {
    const group = this.groups.value()[Number(index)];
    if (!group || index === '') return;
    this.editorValues.update((fields) =>
      fields.map((field) =>
        this.courseFields.includes(field.key)
          ? { ...field, text: String(group[field.key as keyof typeof group]) }
          : field,
      ),
    );
  }
  async reviewEdits(): Promise<void> {
    const row = this.editing(),
      workbook = this.workbook();
    if (!row || !workbook || this.busy()) return;
    const sheet = importSheetKey(row.kind);
    const changes = Object.fromEntries(
      this.editorValues().map((field) => [
        field.key,
        normalizeImportValue(field.key, field.text),
      ]),
    );
    const source = workbook[sheet].find(
      (entry, index) => Number(entry['_row'] ?? index + 2) === row.row,
    )!;
    this.cellIssues.update((issues) =>
      issues.filter(
        (issue) =>
          !(
            issue.kind === row.kind &&
            issue.row === row.row &&
            changes[issue.key] !== String(source[issue.key] ?? '')
          ),
      ),
    );
    this.workbook.set({
      ...workbook,
      [sheet]: workbook[sheet].map((entry, index) =>
        Number(entry['_row'] ?? index + 2) === row.row
          ? { ...entry, ...changes }
          : entry,
      ),
    });
    this.requestId = crypto.randomUUID();
    this.reviewPending.set(true);
    this.hasEdits.set(true);
    this.editing.set(null);
    await this.retryReview();
  }
  async downloadReviewed(): Promise<void> {
    const workbook = this.workbook(),
      year = this.selectedYear();
    if (!workbook || !year || this.busy() || this.cellIssues().length) return;
    this.busy.set(true);
    this.error.set('');
    try {
      downloadFile(
        await createReviewedWorkbook({
          groups: this.groups.value(),
          year: year.anio,
          workbook,
        }),
        `Planilla-revisada-Aulix-${year.anio}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch {
      this.error.set(
        'No se pudo descargar la copia. Tus ajustes siguen en esta página; puedes reintentar.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  private async reviewWorkbook(): Promise<void> {
    const workbook = this.workbook();
    if (!workbook) return;
    const preview = await firstValueFrom(this.api.preview(workbook));
    const issues = this.cellIssues();
    this.preview.set({
      ...preview,
      valid: preview.valid && issues.length === 0,
      rows: preview.rows.map((row) => ({
        ...row,
        errors: [
          ...row.errors,
          ...issues
            .filter((issue) => issue.kind === row.kind && issue.row === row.row)
            .map((issue) => issue.message),
        ],
      })),
    });
    this.reviewPending.set(false);
  }
  async confirm(): Promise<void> {
    const preview = this.preview(),
      workbook = this.workbook();
    if (
      !preview?.valid ||
      !workbook ||
      this.busy() ||
      this.queued() ||
      this.reviewPending() ||
      this.editing()
    )
      return;
    this.busy.set(true);
    this.error.set('');
    try {
      const job = await firstValueFrom(
        this.api.confirm(workbook, preview.version, this.requestId),
      );
      this.jobId.set(job.id);
      this.storeJob(job.id);
      this.preview.set(null);
      this.workbook.set(null);
    } catch (error) {
      this.error.set(readApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async access(): Promise<void> {
    if (!this.jobId() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const access = await firstValueFrom(this.api.access(this.jobId()!));
      const lines = [
        ['Nombre', 'Usuario', 'Contraseña temporal'],
        ...access.map((entry) => [
          entry.name,
          entry.username,
          entry.temporaryPassword,
        ]),
      ];
      downloadFile(
        '\uFEFF' +
          lines.map((row) => row.map(safeCsvCell).join(',')).join('\r\n'),
        'Accesos-nuevos-Aulix.csv',
        'text/csv;charset=utf-8',
      );
      this.accessDownloaded.set(true);
      this.job.reload();
    } catch (error) {
      this.error.set(readApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
  downloadErrors(): void {
    const lines = [
      ['Hoja', 'Fila', 'CI', 'Error'],
      ...(this.preview()?.globalErrors.map((error) => [
        'General',
        '',
        '',
        error,
      ]) ?? []),
      ...(this.preview()
        ?.rows.filter((row) => row.errors.length)
        .map((row) => [
          this.labels[row.kind],
          String(row.row),
          row.person.ci,
          row.errors.join(' '),
        ]) ?? []),
    ];
    downloadFile(
      '\uFEFF' +
        lines.map((row) => row.map(safeCsvCell).join(',')).join('\r\n'),
      'Errores-carga-Aulix.csv',
      'text/csv;charset=utf-8',
    );
  }
  private get storageKey() {
    return `aulix-import:${this.session.userId()}:${this.session.activeSpace()?.id}`;
  }
  private restoreJob(): string | null {
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }
  private storeJob(id: string | null): void {
    try {
      if (id) localStorage.setItem(this.storageKey, id);
      else localStorage.removeItem(this.storageKey);
    } catch {
      /* The running import remains available until this page closes. */
    }
  }
}
