import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TarjetaProgreso } from './dashboard.models';

const SEGMENTOS = 16;

// Tarjeta de avance: porcentaje grande, "18/28 temas" y barra segmentada
@Component({
  selector: 'app-progress-card',
  imports: [FaIconComponent],
  host: { '[class]': "'tono-' + data().tono" },
  styles: `
    :host {
      display: flex; flex-direction: column; gap: 14px; min-width: 0; padding: 16px;
      background: var(--text-light); border: 1px solid var(--line); border-radius: 16px;
    }
    .cabecera { display: flex; align-items: center; gap: 10px; font-weight: bold; color: var(--dark-blue); }
    .icono {
      width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0;
      border-radius: 9px; background: var(--tono-bg); color: var(--tono-fg);
    }
    .titulo { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; line-height: 1.3; }
    .cifras { display: flex; align-items: baseline; justify-content: space-between; }
    .porcentaje { font-size: 26px; font-weight: bold; color: var(--dark-blue); }
    .porcentaje small { font-size: 16px; }
    .conteo { font-size: 13px; color: var(--muted); }
    .conteo strong { color: var(--dark-blue); }
    .barra { display: flex; gap: 3px; }
    .barra span { flex: 1; height: 4px; border-radius: 2px; background: var(--line); }
    .barra span.lleno { background: var(--tono-bar); }
  `,
  template: `
    <div class="cabecera">
      <span class="icono"><fa-icon [icon]="data().icono" /></span>
      <span class="titulo" [title]="data().titulo">{{ data().titulo }}</span>
    </div>
    <div class="cifras">
      <span class="porcentaje">{{ porcentaje() }}<small>%</small></span>
      <span class="conteo"><strong>{{ data().actual }}</strong>/{{ data().total }} {{ data().unidad }}</span>
    </div>
    <div class="barra" role="progressbar" [attr.aria-valuenow]="porcentaje()" aria-valuemin="0" aria-valuemax="100">
      @for (lleno of segmentos(); track $index) {
        <span [class.lleno]="lleno"></span>
      }
    </div>
  `,
})
export class ProgressCardComponent {
  readonly data = input.required<TarjetaProgreso>();

  readonly porcentaje = computed(() => {
    const { actual, total } = this.data();
    return total > 0 ? Math.round((actual / total) * 100) : 0;
  });

  readonly segmentos = computed(() => {
    const llenos = Math.round((this.porcentaje() / 100) * SEGMENTOS);
    return Array.from({ length: SEGMENTOS }, (_, i) => i < llenos);
  });
}
