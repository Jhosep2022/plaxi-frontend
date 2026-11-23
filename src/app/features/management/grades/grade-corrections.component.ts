import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLock, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { SessionService } from '../../../core/auth/session.service';
import { AcademicsService } from '../../../services/academics.service';
import { GradesApiService, type ActividadPlanilla, type FilaPlanilla } from '../../../services/grades-api.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { fechaBolivia, horaBolivia } from '../../../core/utils/bolivia-time';
import { getErrorMessage } from '../academics/academics.ui';

interface Celda {
  estudiante: FilaPlanilla;
  actividad: ActividadPlanilla;
}

// A closed period keeps its marks frozen. Direction (or the secretary) corrects a single mark with a reason:
// the change stays in the history and only that student's final mark is recalculated.
@Component({
  selector: 'app-grade-corrections',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, Tooltip, DrawerComponent, EmptyStateComponent, PageHeaderComponent],
  styles: `
    .filtros { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .aviso { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; margin-bottom: 16px; border-radius: 12px; background: var(--cream-soft); color: var(--cream-strong); font-size: 14px; line-height: 1.5; }
    .tabla { overflow-x: auto; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 14px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: center; white-space: nowrap; }
    th:first-child, td:first-child { text-align: left; position: sticky; left: 0; background: #fff; }
    th { font-size: 12px; color: var(--muted); font-weight: bold; }
    .nota { min-width: 52px; padding: 6px 8px; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; cursor: pointer; }
    .nota:hover, .nota:focus-visible { border-color: var(--lime-green); background: var(--lime-soft); }
    .vacia { color: var(--muted); }
    .final { font-weight: bold; }
    .reprobado { color: #b3392b; }
    .cambio { display: grid; gap: 2px; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
    .cambio small { color: var(--muted); }
    .actual { display: flex; gap: 12px; align-items: baseline; padding: 12px 14px; border-radius: 12px; background: var(--page-bg); }
    .actual strong { font-size: 24px; }
    textarea.ui-input { min-height: 88px; resize: vertical; }
  `,
  template: `
    <app-page-header
      miga="Calificaciones"
      titulo="Corregir notas"
      descripcion="Corrige una nota de un periodo cerrado sin reabrirlo. Cada corrección pide un motivo y queda en el historial."
    />

    <div class="filtros">
      <label class="ui-campo"
        ><span class="ui-etiqueta">Curso y materia</span>
        <select class="ui-input" [value]="clave()" (change)="clave.set($any($event.target).value)">
          <option value="">Elige un curso y una materia</option>
          @for (opcion of opciones(); track opcion.clave) {
            <option [value]="opcion.clave">{{ opcion.paralelo }} · {{ opcion.materia }} — {{ opcion.docente }}</option>
          }
        </select>
      </label>
      <label class="ui-campo"
        ><span class="ui-etiqueta">Periodo cerrado</span>
        <select class="ui-input" [value]="periodo() ?? ''" [disabled]="!elegida()" (change)="elegirPeriodo($any($event.target).value)">
          <option value="">{{ elegida() && !periodosCerrados().length ? 'Ningún periodo cerrado' : 'Elige el periodo' }}</option>
          @for (p of periodosCerrados(); track p.indice) {
            <option [value]="p.indice">{{ p.nombre }}</option>
          }
        </select>
      </label>
    </div>

    <p class="aviso">
      <fa-icon [icon]="faLock" />
      <span>Los periodos abiertos los corrige el docente en su planilla. Aquí solo se corrigen notas de periodos <strong>cerrados</strong>; el boletín se actualiza con la nueva nota final.</span>
    </p>

    @if (planilla.isLoading()) {
      <p class="ui-ayuda">Cargando la planilla…</p>
    } @else if (planilla.value(); as p) {
      <section class="ui-card tabla">
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              @for (a of p.actividades; track a.id) {
                <th [pTooltip]="a.nombre" tooltipPosition="top">{{ a.nombre.length > 14 ? a.nombre.slice(0, 13) + '…' : a.nombre }}</th>
              }
              <th pTooltip="Nota final congelada del periodo, con los pesos de cada criterio" tooltipPosition="top">Final</th>
            </tr>
          </thead>
          <tbody>
            @for (e of p.estudiantes; track e.id) {
              <tr>
                <td>{{ e.nombre }}</td>
                @for (a of p.actividades; track a.id) {
                  <td>
                    <button type="button" class="nota" [class.vacia]="e.notas[a.id] == null" (click)="abrir({ estudiante: e, actividad: a })" [attr.aria-label]="'Corregir ' + a.nombre + ' de ' + e.nombre">
                      {{ e.notas[a.id] ?? '—' }}
                    </button>
                  </td>
                }
                <td class="final" [class.reprobado]="e.aprueba === false">{{ e.resultado.final ?? '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    } @else if (elegida() && periodo() !== null) {
      <app-empty-state [icono]="faPenToSquare" titulo="Sin datos" texto="No pudimos cargar esta planilla." />
    }

    <app-drawer
      [abierto]="!!celda()"
      titulo="Corregir nota"
      [subtitulo]="celda() ? celda()!.estudiante.nombre + ' · ' + celda()!.actividad.nombre : ''"
      (cerrar)="celda.set(null)"
    >
      @if (celda(); as c) {
        <div class="ui-form">
          <div class="actual"><span>Nota actual</span><strong>{{ c.estudiante.notas[c.actividad.id] ?? 'Sin nota' }}</strong></div>
          <label class="ui-campo"
            ><span class="ui-etiqueta">Nota corregida (0 a {{ notaMaxima() }})</span>
            <input class="ui-input" type="number" min="0" [max]="notaMaxima()" step="0.1" [value]="valor()" (input)="valor.set($any($event.target).value)" />
            <span class="ui-ayuda">Déjala vacía para borrar la nota.</span>
          </label>
          <label class="ui-campo"
            ><span class="ui-etiqueta">Motivo de la corrección</span>
            <textarea class="ui-input" maxlength="300" placeholder="Ej. Error al transcribir el examen escrito" [value]="motivo()" (input)="motivo.set($any($event.target).value)"></textarea>
            <span class="ui-ayuda">Queda en el historial con tu nombre y la fecha. Mínimo 10 caracteres.</span>
          </label>
          @if (historial.value()?.length) {
            <div>
              <span class="ui-etiqueta">Cambios anteriores</span>
              @for (h of historial.value(); track h.id) {
                <div class="cambio">
                  <span>{{ h.anterior ?? '—' }} → <strong>{{ h.nuevo ?? '—' }}</strong></span>
                  <small>{{ fechaBolivia(h.fecha) }} {{ horaBolivia(h.fecha) }} · {{ h.usuario || 'El sistema' }}</small>
                  @if (h.motivo) { <small>Motivo: {{ h.motivo }}</small> }
                </div>
              }
            </div>
          }
        </div>
      }
      <ng-container pie>
        <button type="button" class="ui-btn ui-btn--secundario" (click)="celda.set(null)">Cancelar</button>
        <button type="button" class="ui-btn" [disabled]="guardando() || motivo().trim().length < 10" (click)="guardar()">
          {{ guardando() ? 'Guardando…' : 'Guardar corrección' }}
        </button>
      </ng-container>
    </app-drawer>
  `,
})
export class GradeCorrectionsComponent {
  private readonly api = inject(GradesApiService);
  private readonly academico = inject(AcademicsService);
  private readonly avisos = inject(NotificationService);
  private readonly espacioId = inject(SessionService).activeSpace()!.id;

  readonly faLock = faLock;
  readonly faPenToSquare = faPenToSquare;
  readonly fechaBolivia = fechaBolivia;
  readonly horaBolivia = horaBolivia;

  private readonly avance = rxResource({ stream: () => this.api.progress(), defaultValue: [] });
  private readonly gestion = rxResource({ stream: () => this.academico.getActiveAcademicYear(this.espacioId) });
  readonly opciones = computed(() =>
    this.avance.value().map((fila) => ({ ...fila, clave: `${fila.paraleloId}:${fila.materiaId}` })),
  );
  readonly clave = signal('');
  readonly elegida = computed(() => this.opciones().find((opcion) => opcion.clave === this.clave()) ?? null);
  readonly periodosCerrados = computed(() => {
    const nombres = this.gestion.value()?.periodos ?? [];
    return (this.elegida()?.periodos ?? [])
      .filter((p) => p.cerrado)
      .map((p) => ({ indice: p.periodo, nombre: nombres[p.periodo]?.nombre ?? `Periodo ${p.periodo + 1}` }));
  });
  readonly periodo = signal<number | null>(null);
  private readonly version = signal(0);

  readonly planilla = rxResource({
    params: () => {
      const elegida = this.elegida(),
        periodo = this.periodo();
      return elegida && periodo !== null ? { paralelo: elegida.paraleloId, materia: elegida.materiaId, periodo, version: this.version() } : undefined;
    },
    stream: ({ params }) => this.api.sheet(params.paralelo, params.materia, params.periodo),
  });
  readonly notaMaxima = computed(() => this.planilla.value()?.config.notaMaxima ?? 100);

  readonly celda = signal<Celda | null>(null);
  readonly valor = signal('');
  readonly motivo = signal('');
  readonly guardando = signal(false);
  readonly historial = rxResource({
    params: () => this.celda() ?? undefined,
    stream: ({ params }) => (params ? this.api.gradeHistory(params.estudiante.id, params.actividad.id) : of([])),
  });

  elegirPeriodo(value: string): void {
    this.periodo.set(value === '' ? null : Number(value));
  }

  abrir(celda: Celda): void {
    this.celda.set(celda);
    const actual = celda.estudiante.notas[celda.actividad.id];
    this.valor.set(actual == null ? '' : String(actual));
    this.motivo.set('');
  }

  async guardar(): Promise<void> {
    const celda = this.celda();
    if (!celda || this.guardando()) return;
    const texto = this.valor().trim();
    const valor = texto === '' ? null : Number(texto);
    if (valor !== null && (Number.isNaN(valor) || valor < 0 || valor > this.notaMaxima()))
      return this.avisos.error(`La nota debe estar entre 0 y ${this.notaMaxima()}.`);
    this.guardando.set(true);
    try {
      const final = await firstValueFrom(
        this.api.correctClosedGrade({ actividadId: celda.actividad.id, estudianteId: celda.estudiante.id, valor, motivo: this.motivo().trim() }),
      );
      this.avisos.success(`Nota corregida. La nota final de ${celda.estudiante.nombre} en este periodo es ${final ?? '—'}.`);
      this.celda.set(null);
      this.version.update((v) => v + 1);
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
