import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faFileExport } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { readApiError } from '../../../../core/api/api-error';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { environment } from '../../../../../environments/environment';
import { downloadFile } from '../../people/imports/import-workbook';

interface ExportTable {
  titulo: string;
  columnas: string[];
  filas: (string | number | boolean | null)[][];
}

// Same sections as the API (plaxi-backend/src/school-data/school-export.ts)
const SECTIONS = [
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'docentes', label: 'Docentes' },
  { id: 'padres', label: 'Padres y tutores' },
  { id: 'vinculos', label: 'Padres e hijos' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'materias', label: 'Materias' },
  { id: 'inscripciones', label: 'Inscripciones' },
  { id: 'notas', label: 'Notas por actividad' },
  { id: 'notas-finales', label: 'Notas finales' },
  { id: 'cambios-de-notas', label: 'Cambios de notas' },
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'comunicados', label: 'Comunicados' },
  { id: 'pagos', label: 'Pagos a Alclick' },
] as const;

// The school's copy of all its data in one Excel, one sheet per section. It is what the privacy policy
// promises when a school leaves (30 days in read-only to download it), and it can be done at any time.
@Component({
  selector: 'app-export-data',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent],
  styles: `
    .contenido { display: grid; gap: 16px; max-width: 760px; }
    .secciones { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
    .secciones li { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: var(--page-bg); font-size: 14px; }
    .secciones li.lista { background: var(--lime-soft); color: var(--lime-strong); }
    .secciones li.actual { outline: 2px solid var(--lime-green); }
    .secciones small { margin-left: auto; color: var(--muted); }
    .barra { height: 10px; border-radius: 999px; background: var(--page-bg); overflow: hidden; }
    .barra span { display: block; height: 100%; background: var(--lime-green); transition: width 0.4s ease; }
    .nota { font-size: 13px; color: var(--muted); line-height: 1.6; }
    .boton-descarga { justify-self: start; }
  `,
  template: `
    <app-page-header
      miga="Institución"
      titulo="Exportar datos"
      descripcion="Descarga una copia de todos los datos de tu colegio en un solo Excel: personas, cursos, notas, asistencia, comunicados y pagos."
    />
    <section class="ui-card contenido">
      <ul class="secciones">
        @for (s of sections; track s.id; let i = $index) {
          <li [class.lista]="done()[s.id] !== undefined" [class.actual]="current() === i">
            @if (done()[s.id] !== undefined) { <fa-icon [icon]="faCircleCheck" /> }
            {{ s.label }}
            @if (done()[s.id] !== undefined) { <small>{{ done()[s.id] }}</small> }
          </li>
        }
      </ul>
      @if (working()) {
        <div role="status" aria-live="polite">
          <p><strong>Preparando {{ sections[current()]?.label ?? 'el archivo' }}…</strong> {{ progress() }} %</p>
          <div class="barra"><span [style.width.%]="progress()"></span></div>
        </div>
      }
      @if (error()) { <p class="ui-error" role="alert">{{ error() }}</p> }
      <button type="button" class="ui-btn boton-descarga" [disabled]="working()" (click)="download()">
        <fa-icon [icon]="faFileExport" /> {{ working() ? 'Preparando…' : 'Descargar todo en Excel' }}
      </button>
      <p class="nota">
        El archivo tiene datos personales de estudiantes y familias: guárdalo en un lugar seguro. Los archivos subidos (tareas, PDF de las aulas)
        se descargan desde cada aula. Si tu contrato termina, tienes 30 días en solo lectura para descargar esta copia; a los 90 días Alclick borra
        los datos y te entrega una constancia.
      </p>
    </section>
  `,
})
export class ExportDataComponent {
  private readonly http = inject(HttpClient);
  private readonly space = inject(SessionService).activeSpace()!;
  readonly sections = SECTIONS;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileExport = faFileExport;

  readonly working = signal(false);
  readonly current = signal(-1);
  readonly done = signal<Record<string, number>>({});
  readonly error = signal('');
  readonly progress = computed(() => Math.round((Object.keys(this.done()).length / (SECTIONS.length + 1)) * 100));

  async download(): Promise<void> {
    if (this.working()) return;
    this.working.set(true);
    this.error.set('');
    this.done.set({});
    try {
      const Excel = await import('exceljs');
      const book = new (Excel.Workbook ?? Excel.default.Workbook)();
      book.creator = 'Aulix';
      const base = `${environment.API_URL}/espacios/${encodeURIComponent(this.space.slug)}/exportacion`;
      for (const [index, section] of SECTIONS.entries()) {
        this.current.set(index);
        const table = await firstValueFrom(this.http.get<ExportTable>(`${base}/${section.id}`));
        const sheet = book.addWorksheet(section.label.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
        sheet.columns = table.columnas.map((header) => ({ header, width: Math.min(Math.max(header.length + 4, 14), 40) }));
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10102B' } };
        sheet.addRows(table.filas.map((row) => row.map((cell) => (typeof cell === 'boolean' ? (cell ? 'Sí' : 'No') : cell))));
        this.done.update((done) => ({ ...done, [section.id]: table.filas.length }));
      }
      this.current.set(SECTIONS.length);
      const bytes = await book.xlsx.writeBuffer();
      const today = new Date().toISOString().slice(0, 10);
      downloadFile(bytes as ArrayBuffer, `Datos-${this.space.slug}-${today}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (error) {
      this.error.set(readApiError(error).message);
    } finally {
      this.working.set(false);
      this.current.set(-1);
    }
  }
}
