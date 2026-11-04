import { Component, computed, input } from '@angular/core';

export interface ItemGrafico {
  etiqueta: string;
  valor: number;
  texto?: string; // lo que se muestra (por defecto, el valor)
  detalle?: string;
  alerta?: boolean; // se pinta en el tono de advertencia
}

// Barras horizontales: una fila por elemento (curso, docente…)
@Component({
  selector: 'app-barras',
  styles: `
    :host { display: flex; flex-direction: column; gap: 10px; }
    .fila { display: grid; grid-template-columns: minmax(90px, 140px) 1fr 56px; align-items: center; gap: 10px; font-size: 13px; }
    .etiqueta { display: flex; flex-direction: column; min-width: 0; }
    .etiqueta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .etiqueta small { font-size: 11px; color: var(--muted); }
    .pista { height: 12px; border-radius: 6px; background: var(--page-bg); overflow: hidden; }
    .pista span { display: block; height: 100%; border-radius: 6px; background: var(--lime-green); transition: width 0.3s; }
    .pista span.alerta { background: #d9b48f; }
    .valor { font-weight: bold; text-align: right; }
    .valor.alerta { color: var(--cream-strong); }
    .vacio { font-size: 13px; color: var(--muted); }
  `,
  template: `
    @for (i of items(); track i.etiqueta) {
      <div class="fila">
        <span class="etiqueta"><strong [title]="i.etiqueta">{{ i.etiqueta }}</strong>@if (i.detalle) { <small>{{ i.detalle }}</small> }</span>
        <span class="pista"><span [class.alerta]="i.alerta" [style.width.%]="ancho(i.valor)"></span></span>
        <span class="valor" [class.alerta]="i.alerta">{{ i.texto ?? i.valor }}</span>
      </div>
    } @empty {
      <p class="vacio">{{ vacio() }}</p>
    }
  `,
})
export class BarrasComponent {
  readonly items = input.required<ItemGrafico[]>();
  readonly max = input<number | null>(100); // null = el mayor valor de la lista
  readonly vacio = input('Sin datos en este rango.');

  private readonly tope = computed(() => this.max() ?? Math.max(1, ...this.items().map((i) => i.valor)));

  ancho(valor: number): number {
    return Math.max(0, Math.min(100, (valor / this.tope()) * 100));
  }
}

// Columnas verticales: distribución de notas, asistencia por día…
@Component({
  selector: 'app-columnas',
  styles: `
    :host { display: block; }
    .grafico { display: flex; align-items: flex-end; gap: 8px; height: 180px; padding-top: 18px; border-bottom: 1px solid var(--line); }
    .columna { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
    .columna small { font-size: 11px; font-weight: bold; color: var(--dark-blue); }
    .barra { width: 100%; max-width: 46px; min-height: 2px; border-radius: 8px 8px 0 0; background: var(--lime-green); transition: height 0.3s; }
    .barra.alerta { background: #d9b48f; }
    .etiquetas { display: flex; gap: 8px; margin-top: 6px; }
    .etiquetas span { flex: 1; min-width: 0; font-size: 11px; color: var(--muted); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vacio { font-size: 13px; color: var(--muted); }
  `,
  template: `
    @if (items().length) {
      <div class="grafico">
        @for (i of items(); track i.etiqueta) {
          <div class="columna" [title]="i.etiqueta + ': ' + (i.texto ?? i.valor)">
            <small>{{ i.texto ?? i.valor }}</small>
            <div class="barra" [class.alerta]="i.alerta" [style.height.%]="alto(i.valor)"></div>
          </div>
        }
      </div>
      <div class="etiquetas">
        @for (i of items(); track i.etiqueta) { <span>{{ i.etiqueta }}</span> }
      </div>
    } @else {
      <p class="vacio">{{ vacio() }}</p>
    }
  `,
})
export class ColumnasComponent {
  readonly items = input.required<ItemGrafico[]>();
  readonly max = input<number | null>(null);
  readonly vacio = input('Sin datos en este rango.');

  private readonly tope = computed(() => this.max() ?? Math.max(1, ...this.items().map((i) => i.valor)));

  alto(valor: number): number {
    return Math.max(0, Math.min(88, (valor / this.tope()) * 88));
  }
}
