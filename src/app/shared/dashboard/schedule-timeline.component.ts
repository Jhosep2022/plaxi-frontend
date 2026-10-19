import { Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { EventoHorario } from './dashboard.models';

const ALTO_FILA = 56;

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const aHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

// Línea de tiempo del día: horas arriba, un evento por fila y marcador de la hora actual
@Component({
  selector: 'app-schedule-timeline',
  imports: [FaIconComponent],
  styles: `
    :host { display: block; overflow-x: auto; }
    .lienzo { position: relative; min-width: 620px; padding: 0 32px; }
    .zona { position: relative; }
    .horas { position: relative; height: 32px; margin-bottom: 8px; }
    .hora {
      position: absolute; transform: translateX(-50%); padding: 6px 10px; border-radius: 8px;
      background: var(--page-bg); color: var(--muted); font-size: 12px; white-space: nowrap;
    }
    .ahora { background: var(--dark-blue); color: var(--text-light); font-weight: bold; z-index: 2; }
    .pista { position: relative; }
    .linea { position: absolute; top: 0; bottom: 0; border-left: 1px dashed var(--line); }
    .linea.ahora-linea { border-left: 2px dashed var(--dark-blue); z-index: 1; }
    .evento {
      position: absolute; display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 10px;
      min-width: 180px; box-sizing: border-box; border-radius: 10px; border-left: 3px solid var(--tono-bar);
      background: var(--tono-bg); color: var(--dark-blue); overflow: hidden; z-index: 1;
    }
    .evento-icono {
      width: 26px; height: 26px; display: grid; place-items: center; flex-shrink: 0;
      border-radius: 7px; background: var(--text-light); color: var(--tono-fg); font-size: 12px;
    }
    .evento-texto { display: flex; flex-direction: column; min-width: 0; }
    .evento-texto strong, .evento-texto small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .evento-texto strong { font-size: 13px; }
    .evento-texto small { font-size: 11px; color: var(--muted); }
    .vacio { margin: 0; padding: 24px 0; text-align: center; color: var(--muted); }
  `,
  template: `
    @if (eventos().length === 0) {
      <p class="vacio">No tienes actividades programadas para hoy.</p>
    } @else {
      <div class="lienzo"><div class="zona">
        <div class="horas">
          @for (h of horas(); track h.label) {
            <span class="hora" [style.left.%]="h.pos">{{ h.label }}</span>
          }
          @if (ahora(); as ahora) {
            <span class="hora ahora" [style.left.%]="ahora.pos">{{ ahora.label }}</span>
          }
        </div>
        <div class="pista" [style.height.px]="eventos().length * ${ALTO_FILA}">
          @for (h of horas(); track h.label) {
            <span class="linea" [style.left.%]="h.pos"></span>
          }
          @if (ahora(); as ahora) {
            <span class="linea ahora-linea" [style.left.%]="ahora.pos"></span>
          }
          @for (e of bloques(); track $index) {
            <div
              class="evento"
              [class]="'tono-' + e.tono"
              [style.left.%]="e.alDerecha ? null : e.left"
              [style.right.%]="e.alDerecha ? 100 - e.left - e.width : null"
              [style.width.%]="e.width"
              [style.top.px]="e.top"
              [title]="e.titulo + ' · ' + e.inicio + ' – ' + e.fin">
              <span class="evento-icono"><fa-icon [icon]="e.icono" /></span>
              <span class="evento-texto">
                <strong>{{ e.titulo }}</strong>
                <small>{{ e.inicio }} · {{ e.detalle }}</small>
              </span>
            </div>
          }
        </div>
      </div></div>
    }
  `,
})
export class ScheduleTimelineComponent {
  readonly eventos = input.required<EventoHorario[]>();
  readonly desde = input('07:00');
  readonly hasta = input('17:00');

  // Hora actual, actualizada cada minuto
  private readonly reloj = toSignal(timer(0, 60_000).pipe(map(() => new Date())), { initialValue: new Date() });

  private readonly rango = computed(() => ({ min: aMinutos(this.desde()), max: aMinutos(this.hasta()) }));

  private posicion(minutos: number): number {
    const { min, max } = this.rango();
    return ((minutos - min) / (max - min)) * 100;
  }

  readonly horas = computed(() => {
    const { min, max } = this.rango();
    const paso = max - min > 8 * 60 ? 120 : 60;
    const horas = [];
    for (let m = Math.ceil(min / 60) * 60; m <= max; m += paso) {
      horas.push({ label: aHora(m), pos: this.posicion(m) });
    }
    return horas;
  });

  readonly ahora = computed(() => {
    const fecha = this.reloj();
    const minutos = fecha.getHours() * 60 + fecha.getMinutes();
    const { min, max } = this.rango();
    return minutos >= min && minutos <= max ? { label: aHora(minutos), pos: this.posicion(minutos) } : null;
  });

  readonly bloques = computed(() =>
    this.eventos().map((e, i) => {
      const left = this.posicion(aMinutos(e.inicio));
      // Los eventos cerca del final se anclan a la derecha para no salirse de la tarjeta
      return { ...e, left, width: this.posicion(aMinutos(e.fin)) - left, top: i * ALTO_FILA + 6, alDerecha: left > 70 };
    })
  );
}
