import { Component, input } from '@angular/core';

// Encabezado de las pantallas de gestión: miga, título, descripción y acciones
@Component({
  selector: 'app-page-header',
  styles: `
    :host { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
    .miga { margin: 0 0 6px; font-size: 13px; color: var(--muted); }
    h1 { margin: 0; font-size: 26px; color: var(--dark-blue); }
    .descripcion { margin: 6px 0 0; font-size: 14px; color: var(--muted); max-width: 640px; }
    .acciones { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  `,
  template: `
    <div>
      @if (miga()) {
        <p class="miga">{{ miga() }}</p>
      }
      <h1>{{ titulo() }}</h1>
      @if (descripcion()) {
        <p class="descripcion">{{ descripcion() }}</p>
      }
    </div>
    <div class="acciones">
      <ng-content />
    </div>
  `,
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>();
  readonly miga = input<string>();
}
