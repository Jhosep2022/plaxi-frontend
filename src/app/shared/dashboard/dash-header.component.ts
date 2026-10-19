import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Accion } from './dashboard.models';

// Saludo, buscador, notificaciones y acción principal del rol
@Component({
  selector: 'app-dash-header',
  imports: [RouterLink, FaIconComponent],
  styles: `
    :host { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: 28px; color: var(--dark-blue); }
    p { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
    .herramientas { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .buscador {
      display: flex; align-items: center; gap: 8px; width: 300px; max-width: 100%;
      padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--text-light); color: var(--muted);
    }
    .buscador input { flex: 1; min-width: 0; border: none; outline: none; background: none; font: inherit; color: var(--dark-blue); }
    .icono-btn {
      position: relative; width: 42px; height: 42px; display: grid; place-items: center;
      border: 1px solid var(--line); border-radius: 10px; background: var(--text-light); color: var(--dark-blue); cursor: pointer;
    }
    .punto { position: absolute; top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 50%; background: var(--lime-green); }
    .accion {
      display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 10px;
      background: var(--lime-green); color: var(--dark-blue); font-weight: bold; text-decoration: none;
    }
    .accion:hover { background: var(--dark-blue); color: var(--lime-green); }
  `,
  template: `
    <div>
      <h1>{{ saludo() }}</h1>
      <p>{{ subtitulo() }}</p>
    </div>
    <div class="herramientas">
      <label class="buscador">
        <fa-icon [icon]="faMagnifyingGlass" />
        <input type="search" [placeholder]="placeholder()" aria-label="Buscar" />
      </label>
      <button type="button" class="icono-btn" aria-label="Notificaciones">
        <fa-icon [icon]="faBell" />
        <span class="punto"></span>
      </button>
      @if (accion(); as accion) {
        <a class="accion" [routerLink]="accion.link">
          {{ accion.label }} <fa-icon [icon]="accion.icono" />
        </a>
      }
    </div>
  `,
})
export class DashHeaderComponent {
  readonly saludo = input.required<string>();
  readonly subtitulo = input('');
  readonly placeholder = input('Buscar…');
  readonly accion = input<Accion>();

  readonly faBell = faBell;
  readonly faMagnifyingGlass = faMagnifyingGlass;
}
