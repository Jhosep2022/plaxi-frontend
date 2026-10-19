import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

// Contenedor común de los widgets: título, "Ver todo" opcional y contenido proyectado
@Component({
  selector: 'app-dash-card',
  imports: [RouterLink],
  host: { class: 'dash-card' },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 18px;
      background: var(--text-light);
      border: 1px solid var(--line);
      border-radius: 16px;
      box-sizing: border-box;
    }
    header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
    h3 { margin: 0; font-size: 16px; color: var(--dark-blue); }
    .acciones { display: flex; align-items: center; gap: 8px; }
    .ver-todo { font-size: 13px; color: var(--muted); text-decoration: none; }
    .ver-todo:hover { color: var(--dark-blue); text-decoration: underline; }
  `,
  template: `
    @if (titulo()) {
      <header>
        <h3>{{ titulo() }}</h3>
        <div class="acciones">
          <ng-content select="[acciones]" />
          @if (verTodo(); as link) {
            <a class="ver-todo" [routerLink]="link">Ver todo</a>
          }
        </div>
      </header>
    }
    <ng-content />
  `,
})
export class DashCardComponent {
  readonly titulo = input<string>();
  readonly verTodo = input<string>();
}
