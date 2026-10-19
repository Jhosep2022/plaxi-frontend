import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import { AvatarStackComponent } from './avatar-stack.component';
import { ItemProximo } from './dashboard.models';

// Próximas clases o sesiones: horario, participantes y acción opcional
@Component({
  selector: 'app-upcoming-list',
  imports: [RouterLink, FaIconComponent, AvatarStackComponent],
  styles: `
    :host { display: flex; flex-direction: column; gap: 10px; }
    .item { padding: 12px; border: 1px solid var(--line); border-radius: 12px; }
    .item.destacado { background: var(--page-bg); }
    .cabecera { display: flex; align-items: center; gap: 12px; }
    .icono {
      width: 38px; height: 38px; display: grid; place-items: center; flex-shrink: 0;
      border-radius: 50%; border: 1px solid var(--line); background: var(--text-light); color: var(--dark-blue);
    }
    .destacado .icono { background: var(--dark-blue); color: var(--lime-green); border-color: var(--dark-blue); }
    .texto { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .texto strong { color: var(--dark-blue); font-size: 14px; }
    .texto small { color: var(--muted); font-size: 12px; }
    .pie { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 10px; }
    .accion {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 8px;
      background: var(--lime-green); color: var(--dark-blue); font-size: 12px; font-weight: bold; text-decoration: none;
    }
    .accion:hover { background: var(--dark-blue); color: var(--lime-green); }
    .vacio { margin: 0; color: var(--muted); font-size: 13px; }
  `,
  template: `
    @for (item of items(); track $index; let primero = $first) {
      <div class="item" [class.destacado]="primero && !!item.accion">
        <div class="cabecera">
          <span class="icono"><fa-icon [icon]="item.icono" /></span>
          <span class="texto">
            <strong>{{ item.titulo }}</strong>
            <small><fa-icon [icon]="faClock" /> {{ item.horario }}@if (item.detalle) { · {{ item.detalle }} }</small>
          </span>
        </div>
        <div class="pie">
          <app-avatar-stack [nombres]="item.participantes" [total]="item.totalParticipantes" />
          @if (item.accion; as accion) {
            <a class="accion" [routerLink]="accion.link"><fa-icon [icon]="accion.icono" /> {{ accion.label }}</a>
          }
        </div>
      </div>
    } @empty {
      <p class="vacio">No hay nada programado.</p>
    }
  `,
})
export class UpcomingListComponent {
  readonly items = input.required<ItemProximo[]>();
  readonly faClock = faClock;
}
