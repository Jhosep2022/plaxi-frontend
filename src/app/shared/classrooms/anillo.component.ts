import { Component, computed, input } from '@angular/core';

// Anillo de progreso con su etiqueta y porcentaje (como "Accuracy 40%" de la referencia)
@Component({
  selector: 'app-anillo',
  styles: `
    :host { display: flex; align-items: center; gap: 10px; min-width: 0; }
    svg { width: 34px; height: 34px; flex-shrink: 0; transform: rotate(-90deg); }
    .pista { stroke: var(--line); }
    .valor { stroke: var(--lime-strong); transition: stroke-dasharray 0.4s; }
    .valor.bajo { stroke: #d9b48f; }
    .texto { display: flex; flex-direction: column; min-width: 0; }
    small { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    strong { font-size: 15px; color: var(--dark-blue); }
  `,
  template: `
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <circle class="pista" cx="18" cy="18" r="15" fill="none" stroke-width="4" />
      @if (valor() !== null) {
        <circle class="valor" [class.bajo]="valor()! < umbral()" cx="18" cy="18" r="15" fill="none" stroke-width="4" stroke-linecap="round"
          [attr.stroke-dasharray]="trazo() + ' 100'" pathLength="100" />
      }
    </svg>
    <span class="texto">
      <small>{{ etiqueta() }}</small>
      <strong>{{ valor() === null ? '—' : valor() + '%' }}</strong>
    </span>
  `,
})
export class AnilloComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input<number | null>(null);
  readonly umbral = input(51); // por debajo se pinta en tono de advertencia

  readonly trazo = computed(() => Math.max(0, Math.min(100, this.valor() ?? 0)));
}
