import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import { Popover } from 'primeng/popover';
import { firstValueFrom } from 'rxjs';
import { NotificationsApiService, type Aviso } from '../../core/api/notifications-api.service';
import { SessionService } from '../../core/auth/session.service';
import { fechaBolivia, horaBolivia } from '../../core/utils/bolivia-time';
import { formatShortDate, todayIso } from '../../core/utils/attendance';
import { rutaDeAviso } from '../../core/utils/notice-route';
import { Accion } from './dashboard.models';

// Saludo, avisos de la campana y acción principal del rol
@Component({
  selector: 'app-dash-header',
  imports: [RouterLink, FaIconComponent, Popover],
  styles: `
    :host { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: 28px; color: var(--dark-blue); }
    p { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
    .herramientas { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .icono-btn {
      position: relative; width: 42px; height: 42px; display: grid; place-items: center;
      border: 1px solid var(--line); border-radius: 10px; background: var(--text-light); color: var(--dark-blue); cursor: pointer;
    }
    .contador {
      position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 10px;
      display: grid; place-items: center; background: var(--lime-green); color: var(--dark-blue); font-size: 11px; font-weight: bold;
    }
    .accion {
      display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 10px;
      background: var(--lime-green); color: var(--dark-blue); font-weight: bold; text-decoration: none;
    }
    .accion:hover { background: var(--dark-blue); color: var(--lime-green); }
    .panel { width: min(360px, calc(100vw - 32px)); }
    .panel-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .panel-cabecera strong { color: var(--dark-blue); }
    .enlace { border: none; background: none; padding: 0; color: var(--dark-blue); font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; }
    ul { list-style: none; margin: 0; padding: 0; max-height: 380px; overflow-y: auto; }
    li button {
      width: 100%; display: grid; gap: 2px; padding: 10px; border: none; border-radius: 8px; background: none;
      text-align: left; font: inherit; color: var(--dark-blue); cursor: pointer;
    }
    li button:hover { background: var(--surface-soft, #f4f6f8); }
    li.nueva button { background: color-mix(in srgb, var(--lime-green) 14%, transparent); }
    li small { color: var(--muted); font-size: 12px; }
    .vacio { padding: 12px 4px; color: var(--muted); font-size: 14px; }
  `,
  template: `
    <div>
      <h1>{{ saludo() }}</h1>
      <p>{{ subtitulo() }}</p>
    </div>
    <div class="herramientas">
      <button type="button" class="icono-btn" [attr.aria-label]="etiquetaCampana()" (click)="abrir(panel, $event)">
        <fa-icon [icon]="faBell" />
        @if (noLeidas()) { <span class="contador">{{ noLeidas() > 99 ? '99+' : noLeidas() }}</span> }
      </button>
      <p-popover #panel>
        <div class="panel">
          <div class="panel-cabecera">
            <strong>Avisos</strong>
            @if (noLeidas()) { <button type="button" class="enlace" (click)="leerTodos()"><fa-icon [icon]="faCheckDouble" /> Marcar todos como leídos</button> }
          </div>
          @if (avisos.isLoading() && !avisos.hasValue()) {
            <p class="vacio">Cargando avisos…</p>
          } @else if (avisos.error()) {
            <p class="vacio">No se pudieron cargar los avisos. Intenta de nuevo en un momento.</p>
          } @else {
            <ul>
              @for (aviso of avisos.value()?.avisos ?? []; track aviso.id) {
                <li [class.nueva]="!aviso.leida">
                  <button type="button" (click)="ir(aviso, panel)">
                    <strong>{{ aviso.titulo }}</strong>
                    @if (aviso.mensaje) { <span>{{ aviso.mensaje }}</span> }
                    <small>{{ cuando(aviso.creada) }}</small>
                  </button>
                </li>
              } @empty {
                <li class="vacio">No tienes avisos. Aquí verás notas, faltas, tareas y comunicados nuevos.</li>
              }
            </ul>
          }
        </div>
      </p-popover>
      @if (accion(); as accion) {
        <a class="accion" [routerLink]="accion.link">
          {{ accion.label }} <fa-icon [icon]="accion.icono" />
        </a>
      }
    </div>
  `,
})
export class DashHeaderComponent {
  private readonly api = inject(NotificationsApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly saludo = input.required<string>();
  readonly subtitulo = input('');
  readonly accion = input<Accion>();

  readonly avisos = rxResource({ stream: () => this.api.list() });
  readonly noLeidas = computed(() => (this.avisos.hasValue() ? this.avisos.value().noLeidas : 0));
  readonly etiquetaCampana = computed(() => (this.noLeidas() ? `Avisos: ${this.noLeidas()} sin leer` : 'Avisos'));

  readonly faBell = faBell;
  readonly faCheckDouble = faCheckDouble;

  abrir(panel: Popover, evento: Event): void {
    this.avisos.reload();
    panel.toggle(evento);
  }

  async ir(aviso: Aviso, panel: Popover): Promise<void> {
    panel.hide();
    if (!aviso.leida) {
      await firstValueFrom(this.api.markRead(aviso.id)).catch(() => undefined);
      this.avisos.reload();
    }
    const slug = aviso.enlace.replace(/^\/+/, '').split('/')[0];
    await this.router.navigateByUrl(rutaDeAviso(aviso.enlace, this.session.membershipBySlug(slug)?.rol ?? null));
  }

  async leerTodos(): Promise<void> {
    await firstValueFrom(this.api.markAllRead()).catch(() => undefined);
    this.avisos.reload();
  }

  // "Hoy, 22:30" o "16 nov, 22:30" en hora de Bolivia
  cuando(iso: string): string {
    const fecha = fechaBolivia(iso);
    return `${fecha === todayIso() ? 'Hoy' : formatShortDate(fecha)}, ${horaBolivia(iso)}`;
  }
}
