import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HijoActivoService } from '../../services/hijo-activo.service';

// Pestañas para que el padre elija de cuál de sus hijos ver la información (solo si tiene más de uno)
@Component({
  selector: 'app-selector-hijo',
  styles: `
    :host { display: block; }
    .ui-tabs { margin-bottom: 16px; }
    small { font-weight: normal; opacity: 0.75; }
  `,
  template: `
    @if (hijos.value().length > 1) {
      <div class="ui-tabs" role="tablist" aria-label="Hijo">
        @for (h of hijos.value(); track h.id) {
          <button type="button" role="tab" class="ui-tab" [class.activa]="h.id === activoId()" [attr.aria-selected]="h.id === activoId()" (click)="servicio.elegir(h.id)">
            {{ h.nombre }} <small>· {{ h.curso }}</small>
          </button>
        }
      </div>
    }
  `,
})
export class SelectorHijoComponent {
  readonly servicio = inject(HijoActivoService);
  readonly hijos = rxResource({ stream: () => this.servicio.hijos(), defaultValue: [] });
  readonly activoId = computed(() => {
    const hs = this.hijos.value();
    return hs.find((h) => h.id === this.servicio.elegidoId())?.id ?? hs[0]?.id ?? 0;
  });
}
