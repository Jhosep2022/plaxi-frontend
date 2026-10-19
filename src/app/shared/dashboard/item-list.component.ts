import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { ItemActividad, ItemLista } from './dashboard.models';

// Lista de filas con ícono, título, subtítulo y dato a la derecha.
// Sirve para "Mis clases", "Mis cursos" y "Actividad reciente" (variante 'tarjetas').
@Component({
  selector: 'app-item-list',
  imports: [RouterLink, FaIconComponent],
  styles: `
    :host { display: flex; flex-direction: column; }
    .fila { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .fila:last-child { border-bottom: none; }
    :host(.tarjetas) { gap: 10px; }
    :host(.tarjetas) .fila { padding: 12px; border: 1px solid var(--line); border-radius: 12px; }
    .icono {
      width: 36px; height: 36px; display: grid; place-items: center; flex-shrink: 0;
      border-radius: 9px; background: var(--tono-bg); color: var(--tono-fg);
    }
    .texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .texto strong, .texto small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .texto strong { color: var(--dark-blue); font-size: 14px; }
    .texto small { color: var(--muted); font-size: 12px; }
    .meta { font-size: 13px; font-weight: bold; color: var(--dark-blue); white-space: nowrap; }
    :host(.tarjetas) .meta { color: var(--lime-strong); }
    .ir {
      width: 28px; height: 28px; display: grid; place-items: center; flex-shrink: 0;
      border: 1px solid var(--line); border-radius: 8px; color: var(--dark-blue); font-size: 11px;
    }
    .ir:hover { background: var(--lime-green); border-color: var(--lime-green); }
    .vacio { margin: 0; color: var(--muted); font-size: 13px; }
  `,
  template: `
    @for (item of items(); track $index) {
      <div class="fila" [class]="'tono-' + item.tono">
        <span class="icono"><fa-icon [icon]="item.icono" /></span>
        <span class="texto">
          <strong>{{ item.titulo }}</strong>
          <small>{{ subtitulo(item) }}</small>
        </span>
        <span class="meta">{{ item.meta }}</span>
        @if (link(item); as link) {
          <a class="ir" [routerLink]="link" [attr.aria-label]="'Abrir ' + item.titulo"><fa-icon [icon]="faChevronRight" /></a>
        }
      </div>
    } @empty {
      <p class="vacio">{{ vacio() }}</p>
    }
  `,
})
export class ItemListComponent {
  readonly items = input.required<(ItemLista | ItemActividad)[]>();
  readonly vacio = input('No hay elementos para mostrar.');
  readonly faChevronRight = faChevronRight;

  subtitulo(item: ItemLista | ItemActividad): string {
    return 'subtitulo' in item ? item.subtitulo : item.detalle;
  }

  link(item: ItemLista | ItemActividad): string | undefined {
    return 'link' in item ? item.link : undefined;
  }
}
