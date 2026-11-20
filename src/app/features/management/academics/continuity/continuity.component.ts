import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import {
  type ContinuityDecision,
  type ContinuityPreview,
  type ContinuityResult,
  type ContinuityStudent,
  ContinuityService,
} from '../../../../services/continuity.service';
import { NotificationService } from '../../../../shared/ui/notification.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { SELECT } from '../../../../shared/ui/select.component';
import { getErrorMessage } from '../academics.ui';

const RESULTADO: Record<ContinuityResult, { texto: string; tono: string }> = {
  promovido: { texto: 'Aprobó', tono: 'tono-lima' },
  repite: { texto: 'Reprobó', tono: 'tono-coral' },
  egresado: { texto: 'Egresa', tono: 'tono-azul' },
  sin_resultado: { texto: 'Sin resultado', tono: 'tono-crema' },
};

const DECISIONES: { value: ContinuityDecision; label: string }[] = [
  { value: 'promovido', label: 'Pasa de grado' },
  { value: 'repite', label: 'Repite el grado' },
  { value: 'egresado', label: 'Egresa' },
  { value: 'no_continua', label: 'No continúa' },
];

const YA: Record<string, string> = { inscrito: 'Ya inscrito', promovido: 'Pasó de grado', repite: 'Repite', egresado: 'Egresó', no_continua: 'No continúa' };

interface Fila {
  decision: ContinuityDecision | '';
  paraleloDestinoId: string;
}

// Next school year without loading students again: Aulix proposes from the annual grades who passes,
// repeats or graduates and a class group for each; the direction reviews and confirms in a batch.
@Component({
  selector: 'app-continuity',
  imports: [FaIconComponent, PageHeaderComponent, ...SELECT],
  template: `
    <app-page-header miga="Académico" titulo="Paso a la siguiente gestión" descripcion="Inscribe en la nueva gestión a los estudiantes que siguen, sin volver a cargarlos. Sus fichas, cuentas e historial se conservan." />

    <section class="ui-card cont-elegir">
      <div class="ui-campo">
        <label for="cont-destino">Gestión que preparas</label>
        <app-select inputId="cont-destino" placeholder="Elige la gestión" [(value)]="destinoId">
          @for (g of destinos(); track g.id) {
            <app-option [value]="g.id" [label]="g.anio + (g.estado === 'activa' ? ' (activa)' : ' (planificada)')" />
          }
        </app-select>
      </div>
      @if (!destinos().length && !years.isLoading()) {
        <p class="ui-ayuda">Primero crea la gestión siguiente y sus paralelos en «Gestión y periodos» y «Grados y paralelos».</p>
      }
    </section>

    @if (vista.isLoading()) {
      <p class="ui-ayuda">Revisando notas y paralelos…</p>
    } @else if (vista.error()) {
      <p class="ui-aviso" role="alert">{{ errorDe(vista.error()) }}</p>
    } @else if (vista.value(); as v) {
      @if (!v.origen.periodosCerrados) {
        <p class="ui-aviso cont-aviso"><fa-icon [icon]="faTriangleExclamation" /> Los periodos de {{ v.origen.anio }} todavía no están cerrados: Aulix no puede saber quién aprobó. Cierra los periodos en «Cierre de periodos» o decide a mano.</p>
      }
      @if (!v.paralelosDestino.length) {
        <p class="ui-aviso cont-aviso"><fa-icon [icon]="faTriangleExclamation" /> La gestión {{ v.destino.anio }} no tiene paralelos. Créalos en «Grados y paralelos» antes de continuar.</p>
      }
      <section class="ui-card cont-resumen">
        <span><strong>{{ pendientes().length }}</strong> por decidir</span>
        <span><strong>{{ listos().length }}</strong> listos para confirmar</span>
        <span><strong>{{ yaHechos() }}</strong> ya registrados en {{ v.destino.anio }}</span>
        <button type="button" class="ui-btn" [disabled]="!listos().length || confirmando()" (click)="confirmar(v)">
          {{ confirmando() ? 'Confirmando…' : 'Confirmar ' + listos().length + ' estudiantes' }}
        </button>
      </section>
      <p class="ui-ayuda cont-ayuda"><fa-icon [icon]="faCircleInfo" /> Aprobó = todas las materias con promedio anual de {{ v.notaAprobacion }} o más. Revisa y cambia lo que haga falta; quienes no tengan decisión no se inscriben.</p>

      @for (grupo of grupos(); track grupo.nombre) {
        <section class="ui-card cont-grupo">
          <h2>{{ grupo.nombre }} <small>{{ v.origen.anio }} → {{ v.destino.anio }}</small></h2>
          <div class="cont-tabla" role="table">
            @for (e of grupo.estudiantes; track e.estudianteId) {
              <div class="cont-fila" role="row">
                <div class="cont-nombre" role="cell">
                  <strong>{{ e.nombre }}</strong>
                  <small>Promedio {{ e.promedio ?? '—' }}@if (e.reprobadas) { · {{ e.reprobadas }} materias reprobadas }</small>
                </div>
                <span role="cell" class="ui-badge" [class]="resultado(e.resultado).tono">{{ resultado(e.resultado).texto }}</span>
                @if (e.yaDecidido) {
                  <span role="cell" class="ui-badge tono-azul cont-ya">{{ ya(e.yaDecidido) }}</span>
                } @else {
                  <div role="cell">
                    <app-select [inputId]="'cont-dec-' + e.estudianteId" placeholder="Decidir" [value]="fila(e).decision" (valueChange)="cambiar(e, 'decision', $event)">
                      @for (d of decisiones; track d.value) { <app-option [value]="d.value" [label]="d.label" /> }
                    </app-select>
                  </div>
                  <div role="cell">
                    @if (necesitaParalelo(e)) {
                      <app-select [inputId]="'cont-par-' + e.estudianteId" placeholder="Paralelo" [value]="fila(e).paraleloDestinoId" [forceError]="!fila(e).paraleloDestinoId" (valueChange)="cambiar(e, 'paraleloDestinoId', $event)">
                        @for (p of v.paralelosDestino; track p.id) { <app-option [value]="p.id" [label]="p.nombre + ' (' + p.inscritos + '/' + p.capacidad + ')'" /> }
                      </app-select>
                    } @else {
                      <span class="ui-ayuda">Sin paralelo</span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }
    }
  `,
  styles: `
    .cont-elegir { display: grid; grid-template-columns: minmax(200px, 320px); gap: 8px; margin-bottom: 16px; }
    .cont-aviso { margin: 0 0 12px; }
    .cont-resumen { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-bottom: 8px; }
    .cont-resumen .ui-btn { margin-left: auto; }
    .cont-ayuda { margin: 0 0 16px; }
    .cont-grupo { margin-bottom: 16px; }
    .cont-grupo h2 { margin: 0 0 12px; font-size: 18px; }
    .cont-grupo h2 small { color: var(--muted); font-weight: 400; font-size: 14px; }
    .cont-tabla { display: grid; gap: 8px; }
    .cont-fila { display: grid; grid-template-columns: minmax(180px, 1.4fr) auto minmax(150px, 1fr) minmax(150px, 1fr); gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line, #ece4da); }
    .cont-nombre { display: grid; gap: 2px; }
    .cont-nombre small { color: var(--muted); }
    .cont-ya { justify-self: start; }
    @media (max-width: 760px) { .cont-fila { grid-template-columns: 1fr auto; } .cont-fila > :nth-child(n + 3) { grid-column: 1 / -1; } }
  `,
})
export class ContinuityComponent {
  private api = inject(ContinuityService);
  private avisos = inject(NotificationService);

  readonly faCircleInfo = faCircleInfo;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly decisiones = DECISIONES;

  readonly years = rxResource({ stream: () => this.api.years() });
  // Years that can receive students: planned or active, after the first one
  readonly destinos = computed(() => {
    const lista = this.years.value() ?? [];
    const anios = new Set(lista.map((g) => g.anio));
    return lista.filter((g) => g.estado !== 'cerrada' && anios.has(g.anio - 1)).sort((a, b) => b.anio - a.anio);
  });
  readonly destinoId = linkedSignal(() => {
    const d = this.destinos();
    return d.find((g) => g.estado === 'planificada')?.id.toString() ?? d.at(0)?.id.toString() ?? '';
  });

  readonly vista = rxResource({
    params: () => Number(this.destinoId()) || null,
    stream: ({ params }) => (params ? this.api.preview(params) : of(null)),
  });

  // The direction's choices, starting from what the grades propose
  readonly filas = linkedSignal<Map<number, Fila>>(() => {
    const mapa = new Map<number, Fila>();
    for (const e of this.vista.value()?.estudiantes ?? []) {
      const decision: Fila['decision'] = e.resultado === 'sin_resultado' ? '' : e.resultado;
      mapa.set(e.estudianteId, { decision, paraleloDestinoId: e.paraleloDestinoId?.toString() ?? '' });
    }
    return mapa;
  });
  readonly confirmando = signal(false);

  readonly grupos = computed(() => {
    const porGrupo = new Map<string, ContinuityStudent[]>();
    for (const e of this.vista.value()?.estudiantes ?? []) porGrupo.set(e.paraleloOrigen, [...(porGrupo.get(e.paraleloOrigen) ?? []), e]);
    return [...porGrupo].map(([nombre, estudiantes]) => ({ nombre, estudiantes }));
  });
  private readonly abiertos = computed(() => (this.vista.value()?.estudiantes ?? []).filter((e) => !e.yaDecidido));
  readonly yaHechos = computed(() => (this.vista.value()?.estudiantes ?? []).filter((e) => e.yaDecidido).length);
  readonly listos = computed(() => this.abiertos().filter((e) => this.completa(e)));
  readonly pendientes = computed(() => this.abiertos().filter((e) => !this.completa(e)));

  fila(e: ContinuityStudent): Fila {
    return this.filas().get(e.estudianteId) ?? { decision: '', paraleloDestinoId: '' };
  }

  necesitaParalelo(e: ContinuityStudent): boolean {
    const d = this.fila(e).decision;
    return d === 'promovido' || d === 'repite';
  }

  private completa(e: ContinuityStudent): boolean {
    const f = this.fila(e);
    return !!f.decision && (!this.necesitaParalelo(e) || !!f.paraleloDestinoId);
  }

  cambiar(e: ContinuityStudent, campo: keyof Fila, valor: string): void {
    this.filas.update((mapa) => new Map(mapa).set(e.estudianteId, { ...this.fila(e), [campo]: valor }));
  }

  resultado(r: ContinuityResult) {
    return RESULTADO[r];
  }

  ya(estado: string): string {
    return YA[estado] ?? estado;
  }

  errorDe(error: unknown): string {
    return getErrorMessage((error as { cause?: unknown }).cause ?? error);
  }

  async confirmar(v: ContinuityPreview): Promise<void> {
    const decisiones = this.listos().map((e) => {
      const f = this.fila(e);
      return {
        estudianteId: e.estudianteId,
        decision: f.decision as ContinuityDecision,
        ...(this.necesitaParalelo(e) ? { paraleloDestinoId: Number(f.paraleloDestinoId) } : {}),
      };
    });
    if (!confirm(`¿Confirmar ${decisiones.length} estudiantes para la gestión ${v.destino.anio}?`)) return;
    this.confirmando.set(true);
    try {
      const r = await firstValueFrom(this.api.confirm(v.destino.id, decisiones));
      this.avisos.success(`${r.inscritos} inscritos en ${v.destino.anio}, ${r.egresados} egresados, ${r.noContinuan} no continúan.`);
      this.vista.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.confirmando.set(false);
    }
  }
}
