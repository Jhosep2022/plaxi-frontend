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
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../../core/auth/session.service';
import { readApiError } from '../../../../core/api/api-error';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import {
  PeopleImportApi,
  type ImportPreview,
  type ImportWorkbook,
} from './import-api.service';
import {
  createImportTemplate,
  downloadFile,
  readImportWorkbook,
  safeCsvCell,
} from './import-workbook';

@Component({
  selector: 'app-people-import',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, RouterLink],
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
  selectYear(value: string): void {
    this.yearId.set(Number(value));
    this.preview.set(null);
    this.workbook.set(null);
    this.filename.set('');
    this.error.set('');
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
    this.preview.set(null);
    this.workbook.set(null);
    try {
      if (
        !file.name.toLowerCase().endsWith('.xlsx') ||
        file.size > 3 * 1024 * 1024
      )
        throw new Error('Elige una plantilla .xlsx de hasta 3 MB.');
      const workbook = await readImportWorkbook(
        await file.arrayBuffer(),
        this.yearId()!,
      );
      const preview = await firstValueFrom(this.api.preview(workbook));
      this.workbook.set(workbook);
      this.preview.set(preview);
      this.filename.set(file.name);
      this.requestId = crypto.randomUUID();
      this.jobId.set(null);
      this.storeJob(null);
      this.accessDownloaded.set(false);
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
  async confirm(): Promise<void> {
    const preview = this.preview(),
      workbook = this.workbook();
    if (!preview?.valid || !workbook || this.busy() || this.queued()) return;
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
