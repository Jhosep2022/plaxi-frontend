import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { Tooltip } from 'primeng/tooltip';
import { SessionService } from '../../../../core/auth/session.service';
import { readApiError } from '../../../../core/api/api-error';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import { PeopleImportApi, type ImportPreview, type ImportWorkbook, type ImportPreviewRow } from './import-api.service';
import {
  courseLabel,
  createImportTemplate,
  createReviewedWorkbook,
  downloadFile,
  readImportDraft,
  importColumns,
  importSheetKey,
  normalizeImportValue,
  type ImportCellIssue,
  type ImportKind,
  MAX_ROWS_PER_SHEET,
  safeCsvCell,
} from './import-workbook';

// About how long the server takes per person (account, record and enrollment), for the progress estimate
const MS_PER_ROW = 25;
type Step = 'template' | 'upload' | 'review' | 'save' | 'done';

// Bulk load of a school: the rows that are right are saved, the ones with a required field wrong wait
// in the review to be fixed, and a wrong optional field (phone, email, date) never blocks the person.
@Component({
  selector: 'app-people-import',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, RouterLink, DrawerComponent, FormField, Tooltip],
  templateUrl: './people-import.component.html',
  styleUrl: './people-import.component.css',
})
export class PeopleImportComponent {
  private readonly api = inject(PeopleImportApi);
  readonly session = inject(SessionService);
  private readonly destroy = inject(DestroyRef);
  readonly maxRows = MAX_ROWS_PER_SHEET;
  readonly courseLabel = courseLabel;
  readonly years = rxResource({ stream: () => this.api.years(), defaultValue: [] });
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
  readonly selectedYear = computed(() => this.years.value().find((year) => year.id === this.yearId()));
  readonly preview = signal<ImportPreview | null>(null);
  readonly workbook = signal<ImportWorkbook | null>(null);
  // Rows left out of the last saved load, to fix and save in a second round
  readonly pending = signal<ImportWorkbook | null>(null);
  readonly filename = signal('');
  readonly busy = signal(false);
  readonly phase = signal<'reading' | 'reviewing' | 'confirming' | null>(null);
  readonly error = signal('');
  readonly cellIssues = signal<ImportCellIssue[]>([]);
  readonly reviewPending = signal(false);
  readonly hasEdits = signal(false);
  readonly editing = signal<ImportPreviewRow | null>(null);
  readonly editorValues = signal<{ key: string; label: string; text: string }[]>([]);
  readonly editorForm = form(this.editorValues);
  readonly filter = signal<'all' | 'errors' | 'warnings'>('all');
  readonly elapsed = signal(0);
  readonly labels = { student: 'Estudiantes', teacher: 'Docentes', parent: 'Padres' };

  // Rows the server reviewed plus the ones whose cells could not be read (they are not sent)
  readonly reviewRows = computed<ImportPreviewRow[]>(() => {
    const preview = this.preview();
    if (!preview) return [];
    const local = this.unreadableRows().map((row) => ({ ...row, errors: row.errors }));
    return [...local, ...preview.rows].sort((left, right) => kindOrder(left.kind) - kindOrder(right.kind) || left.row - right.row);
  });
  readonly errorCount = computed(() => this.reviewRows().filter((row) => row.errors.length).length);
  readonly warningCount = computed(() => this.reviewRows().filter((row) => !row.errors.length && row.warnings.length).length);
  readonly readyCount = computed(() => this.preview()?.summary.ready ?? 0);
  readonly visibleRows = computed(() =>
    this.reviewRows().filter((row) =>
      this.filter() === 'errors' ? row.errors.length : this.filter() === 'warnings' ? !row.errors.length && row.warnings.length : true,
    ),
  );
  readonly totalRows = computed(() => {
    const workbook = this.workbook();
    return workbook ? workbook.students.length + workbook.teachers.length + workbook.parents.length : 0;
  });
  readonly queued = computed(
    () => !!this.jobId() && !this.job.error() && (!this.job.hasValue() || this.job.value()?.status === 'queued'),
  );
  readonly accessDownloaded = signal(false);
  private savingRows = signal(0);
  // Progress of the background save: estimated from the rows sent, never over 95 % until it finishes
  readonly saveProgress = computed(() => {
    const total = Math.max(this.savingRows(), 1) * MS_PER_ROW;
    return Math.min(95, Math.round(((this.elapsed() * 1000) / total) * 100));
  });
  readonly step = computed<Step>(() => {
    if (this.queued()) return 'save';
    if (this.job.value()?.status === 'completed' && !this.preview()) return 'done';
    if (this.preview() || this.phase() === 'reviewing') return 'review';
    if (this.workbook() || this.phase() === 'reading') return 'upload';
    return 'template';
  });
  readonly steps: { id: Step; label: string }[] = [
    { id: 'template', label: 'Plantilla' },
    { id: 'upload', label: 'Subir' },
    { id: 'review', label: 'Revisar' },
    { id: 'save', label: 'Guardar' },
  ];
  readonly stepIndex = computed(() => {
    const step = this.step();
    return step === 'done' ? this.steps.length : this.steps.findIndex((entry) => entry.id === step);
  });
  private requestId = crypto.randomUUID();

  constructor() {
    effect(() => {
      if (this.yearId() === undefined && this.years.hasValue())
        this.yearId.set(
          this.years.value().find((year) => year.estado === 'activa')?.id ??
            this.years.value().find((year) => year.estado !== 'cerrada')?.id,
        );
    });
    const timer = setInterval(() => {
      if (this.queued()) {
        this.elapsed.update((seconds) => seconds + 1);
        if (this.elapsed() % 2 === 0 && !this.job.isLoading()) this.job.reload();
      }
    }, 1000);
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
    this.reset();
  }

  async template(): Promise<void> {
    if (!this.selectedYear() || this.busy() || this.groups.isLoading() || this.groups.error()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      downloadFile(
        await createImportTemplate(this.groups.value(), this.selectedYear()!.anio),
        `Plantilla-Aulix-${this.selectedYear()!.anio}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo crear la plantilla.');
    } finally {
      this.phase.set(null);
      this.busy.set(false);
    }
  }

  async upload(file: File | undefined): Promise<void> {
    if (!file || !this.yearId() || this.busy() || this.queued()) return;
    this.busy.set(true);
    this.phase.set('reading');
    this.error.set('');
    try {
      await yieldForPaint();
      if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 3 * 1024 * 1024)
        throw new Error('Elige un Excel .xlsx de hasta 3 MB.');
      const draft = await readImportDraft(await file.arrayBuffer(), this.yearId()!);
      this.workbook.set(draft.workbook);
      this.cellIssues.set(draft.issues);
      this.preview.set(null);
      this.pending.set(null);
      this.reviewPending.set(true);
      this.filename.set(file.name);
      this.filter.set('all');
      this.requestId = crypto.randomUUID();
      this.jobId.set(null);
      this.storeJob(null);
      this.accessDownloaded.set(false);
      this.hasEdits.set(false);
      this.editing.set(null);
      await this.reviewWorkbook();
    } catch (error) {
      this.error.set(error instanceof Error && !('status' in error) ? error.message : readApiError(error).message);
    } finally {
      this.phase.set(null);
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
      this.phase.set(null);
      this.busy.set(false);
    }
  }

  // Loads the rows left out of the last load to fix them and save them in a second round
  async fixPending(): Promise<void> {
    const pending = this.pending();
    if (!pending || this.busy() || this.queued()) return;
    this.workbook.set(pending);
    this.cellIssues.set([]);
    this.pending.set(null);
    this.jobId.set(null);
    this.storeJob(null);
    this.filter.set('errors');
    this.hasEdits.set(true);
    this.requestId = crypto.randomUUID();
    await this.retryReview();
  }

  editRow(row: ImportPreviewRow): void {
    if (this.busy() || this.queued()) return;
    // A tutor written in the student's row is fixed in that student's row
    const kind: ImportKind = row.fromStudentRow ? 'student' : row.kind;
    const source = this.sourceOf(kind, row.row);
    if (!source) return;
    this.editorValues.set(
      importColumns(kind).map(([label, key]) => ({
        key,
        label,
        text: String(key === 'curso' ? source['curso'] || this.legacyCourse(source) : (source[key] ?? '')),
      })),
    );
    this.editing.set({ ...row, kind });
  }

  async reviewEdits(): Promise<void> {
    const row = this.editing(),
      workbook = this.workbook();
    if (!row || !workbook || this.busy()) return;
    const sheet = importSheetKey(row.kind);
    const changes = Object.fromEntries(this.editorValues().map((field) => [field.key, normalizeImportValue(field.key, field.text)]));
    this.cellIssues.update((issues) => issues.filter((issue) => !(issue.kind === row.kind && issue.row === row.row)));
    this.workbook.set({
      ...workbook,
      [sheet]: workbook[sheet].map((entry, index) => (Number(entry['_row'] ?? index + 2) === row.row ? { ...entry, ...changes } : entry)),
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
    if (!workbook || !year || this.busy() || this.groups.isLoading() || this.groups.error()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      downloadFile(
        await createReviewedWorkbook({ groups: this.groups.value(), year: year.anio, workbook }),
        `Planilla-revisada-Aulix-${year.anio}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch {
      this.error.set('No se pudo descargar la copia. Tus ajustes siguen en esta página; puedes reintentar.');
    } finally {
      this.phase.set(null);
      this.busy.set(false);
    }
  }

  async confirm(): Promise<void> {
    const preview = this.preview(),
      workbook = this.workbook();
    if (!preview?.valid || !workbook || this.busy() || this.queued() || this.reviewPending() || this.editing()) return;
    this.busy.set(true);
    this.phase.set('confirming');
    this.error.set('');
    try {
      const job = await firstValueFrom(this.api.confirm(this.sentWorkbook(workbook), preview.version, this.requestId));
      this.pending.set(this.rowsToFix(workbook));
      this.savingRows.set(preview.summary.ready);
      this.elapsed.set(0);
      this.jobId.set(job.id);
      this.storeJob(job.id);
      this.preview.set(null);
      this.workbook.set(null);
    } catch (error) {
      this.error.set(readApiError(error).message);
    } finally {
      this.phase.set(null);
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
        ...access.map((entry) => [entry.name, entry.username, entry.temporaryPassword]),
      ];
      downloadFile(
        '﻿' + lines.map((row) => row.map(safeCsvCell).join(',')).join('\r\n'),
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
      ['Hoja', 'Fila', 'Persona', 'CI', 'Qué corregir'],
      ...(this.preview()?.globalErrors.map((error) => ['General', '', '', '', error]) ?? []),
      ...this.reviewRows()
        .filter((row) => row.errors.length)
        .map((row) => [
          this.rowSheet(row),
          String(row.row),
          `${row.person.nombres} ${row.person.primerApellido}`.trim(),
          row.person.ci,
          row.errors.join(' '),
        ]),
    ];
    downloadFile(
      '﻿' + lines.map((row) => row.map(safeCsvCell).join(',')).join('\r\n'),
      'Filas-por-corregir-Aulix.csv',
      'text/csv;charset=utf-8',
    );
  }

  rowSheet(row: ImportPreviewRow): string {
    return row.fromStudentRow ? 'Estudiantes (tutor)' : this.labels[row.kind];
  }

  courseOptions(): string[] {
    return this.groups.value().map(courseLabel);
  }

  private async reviewWorkbook(): Promise<void> {
    const workbook = this.workbook();
    if (!workbook) return;
    this.phase.set('reviewing');
    await yieldForPaint();
    const sent = this.sentWorkbook(workbook);
    const hasRows = sent.students.length + sent.teachers.length + sent.parents.length > 0;
    const preview = hasRows
      ? await firstValueFrom(this.api.preview(sent))
      : { valid: false, version: '', globalErrors: [], rows: [], summary: { rows: 0, ready: 0, withErrors: 0, withWarnings: 0, newPeople: 0, existingPeople: 0 } };
    this.preview.set(preview);
    this.reviewPending.set(false);
  }

  // Rows with unreadable cells (a formula, an Excel error) are not sent until they are fixed here
  private sentWorkbook(workbook: ImportWorkbook): ImportWorkbook {
    const blocked = new Set(this.cellIssues().map((issue) => `${issue.kind}:${issue.row}`));
    const keep = (kind: ImportKind) => (entry: Record<string, unknown>) => !blocked.has(`${kind}:${entry['_row']}`);
    return {
      yearId: workbook.yearId,
      students: workbook.students.filter(keep('student')),
      teachers: workbook.teachers.filter(keep('teacher')),
      parents: workbook.parents.filter(keep('parent')),
    };
  }

  private unreadableRows(): ImportPreviewRow[] {
    const byRow = new Map<string, ImportPreviewRow>();
    for (const issue of this.cellIssues()) {
      const key = `${issue.kind}:${issue.row}`;
      const source = this.sourceOf(issue.kind, issue.row) ?? {};
      const row = byRow.get(key) ?? {
        kind: issue.kind,
        row: issue.row,
        person: { nombres: String(source['nombres'] ?? ''), primerApellido: String(source['primerApellido'] ?? ''), ci: String(source['ci'] ?? '') },
        action: 'create' as const,
        errors: [],
        warnings: [],
      };
      row.errors.push(issue.message);
      byRow.set(key, row);
    }
    return [...byRow.values()];
  }

  // The rows of the sheet that were not saved: a student keeps their tutor columns
  private rowsToFix(workbook: ImportWorkbook): ImportWorkbook | null {
    const failed = new Set(
      this.reviewRows()
        .filter((row) => row.errors.length)
        .map((row) => `${row.fromStudentRow ? 'student' : row.kind}:${row.row}`),
    );
    if (!failed.size) return null;
    const keep = (kind: ImportKind) => (entry: Record<string, unknown>) => failed.has(`${kind}:${entry['_row']}`);
    return {
      yearId: workbook.yearId,
      students: workbook.students.filter(keep('student')),
      teachers: workbook.teachers.filter(keep('teacher')),
      parents: workbook.parents.filter(keep('parent')),
    };
  }

  private sourceOf(kind: ImportKind, row: number): Record<string, unknown> | undefined {
    return this.workbook()?.[importSheetKey(kind)].find((entry, index) => Number(entry['_row'] ?? index + 2) === row);
  }

  private legacyCourse(source: Record<string, unknown>): string {
    const group = this.groups
      .value()
      .find(
        (entry) =>
          entry.nivel === source['nivel'] &&
          String(entry.grado) === String(source['grado']) &&
          entry.letra.toUpperCase() === String(source['letra'] ?? '').toUpperCase() &&
          entry.turno === source['turno'],
      );
    return group ? courseLabel(group) : '';
  }

  private reset(): void {
    this.preview.set(null);
    this.workbook.set(null);
    this.filename.set('');
    this.cellIssues.set([]);
    this.reviewPending.set(false);
    this.hasEdits.set(false);
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

const kindOrder = (kind: ImportKind) => ({ student: 0, teacher: 1, parent: 2 })[kind];

function yieldForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}
