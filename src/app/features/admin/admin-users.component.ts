import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faEnvelope, faEye, faHourglassHalf, faMagnifyingGlass, faShieldHalved, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { defaultAvatar } from '../../core/avatars';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { spaceRoleLabel, type AdminUser } from './admin.service';
import { AdminUsersApiService, type AdminUserFilter as UserFilter } from './admin-users-api.service';
import { getErrorMessage } from '../management/academics/academics.ui';

@Component({
  selector: 'app-admin-users',
  host: { class: 'ui-pagina' },
  imports: [EmptyStateComponent, FaIconComponent, Tooltip, AvatarComponent, DrawerComponent, PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma · Cuentas" titulo="Usuarios" descripcion="Todas las cuentas de Aulix. Desde aquí administras el acceso; no se ven datos académicos." />

    <div class="indicadores">
      <div class="ui-card indicador destacado">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faUsers" /></span>
        <div><strong>{{ count().all }}</strong><small>cuentas en total</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faCircleCheck" /></span>
        <div><strong>{{ count().active }}</strong><small>activas</small></div>
      </div>
      <div class="ui-card indicador" pTooltip="Cuentas creadas por la dirección que todavía no eligieron su contraseña" tooltipPosition="bottom">
        <span class="ui-icono tono-crema"><fa-icon [icon]="faHourglassHalf" /></span>
        <div><strong>{{ count().pending }}</strong><small>sin activar</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono"><fa-icon [icon]="faShieldHalved" /></span>
        <div><strong>{{ count().team }}</strong><small>del equipo de plataforma</small></div>
      </div>
    </div>

    <div class="filtros">
      <label class="buscar">
        <fa-icon [icon]="faMagnifyingGlass" />
        <input class="ui-input" placeholder="Buscar por nombre, usuario o correo" [value]="search()" (input)="search.set($any($event.target).value)" aria-label="Buscar usuarios" />
      </label>
      <div class="ui-tabs" role="tablist" aria-label="Filtrar cuentas">
        @for (tab of tabs; track tab.id) {
          <button type="button" class="ui-tab" role="tab" [class.activa]="filter() === tab.id" [attr.aria-selected]="filter() === tab.id" (click)="filter.set(tab.id)">
            {{ tab.label }} <span class="contador">{{ countFor(tab.id) }}</span>
          </button>
        }
      </div>
    </div>

    <div class="ui-card">
      <div class="ui-tabla-contenedor">
        <table class="ui-tabla">
          <thead><tr><th>Persona</th><th>Correo</th><th>Espacios y roles</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @if (users.isLoading() && !users.value().length) {
              <tr><td colspan="5" class="secundario">Cargando cuentas…</td></tr>
            }
            @for (user of visible(); track user.id) {
              <tr [class.inactivo]="!user.active">
                <td>
                  <div class="persona">
                    <app-avatar [avatar]="avatarOf(user)" [firstName]="user.firstName" [lastName]="user.lastName" [size]="36" />
                    <div><strong>{{ user.firstName }} {{ user.lastName }}</strong><small>&#64;{{ user.username }}</small></div>
                  </div>
                </td>
                <td>
                  <div class="contacto">
                    @if (user.email) { <span><fa-icon [icon]="faEnvelope" /> {{ user.email }}</span> } @else { <span class="secundario">Sin correo</span> }
                  </div>
                </td>
                <td>
                  @if (user.isAdmin) {
                    <span class="ui-badge tono-azul">Equipo de plataforma</span>
                  } @else {
                    @let memberships = user.spaces;
                    <div class="chips">
                      @for (membership of memberships.slice(0, 2); track membership.name + membership.role) {
                        <span class="ui-badge" [pTooltip]="membership.name" tooltipPosition="top">{{ roleLabel(membership.role) }}</span>
                      }
                      @if (memberships.length > 2) { <span class="ui-badge" [pTooltip]="restOf(memberships)" tooltipPosition="top">+{{ memberships.length - 2 }}</span> }
                      @if (!memberships.length) { <span class="secundario">Sin espacios</span> }
                    </div>
                  }
                </td>
                <td>
                  @if (user.pending) {
                    <span class="ui-badge tono-crema">Sin activar</span>
                  } @else {
                    <span class="ui-badge" [class.tono-lima]="user.active">{{ user.active ? 'Activa' : 'Inactiva' }}</span>
                  }
                </td>
                <td>
                  <div class="acciones">
                    <button type="button" class="ui-btn ui-btn--icono" (click)="open(user.id)" [attr.aria-label]="'Ver cuenta de ' + user.firstName" pTooltip="Ver cuenta y acceso" tooltipPosition="left"><fa-icon [icon]="faEye" /></button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="vacio"><app-empty-state [compact]="true" titulo="No encontramos cuentas" texto="Prueba otro nombre o cambia el filtro de estado." /></td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="paginas"><button type="button" class="ui-btn ui-btn--secundario" [disabled]="page() === 1" (click)="changePage(-1)">Anterior</button><span>Página {{ page() }}</span><button type="button" class="ui-btn ui-btn--secundario" [disabled]="users.value().length < 50" (click)="changePage(1)">Siguiente</button></div>
    </div>

    <app-drawer [abierto]="!!details()" [titulo]="details() ? details()!.firstName + ' ' + details()!.lastName : ''" [subtitulo]="details() ? '@' + details()!.username : ''" (cerrar)="selectedId.set(null)">
      @if (details(); as user) {
        <dl class="ficha">
          <div><dt>Estado</dt><dd>{{ user.pending ? 'Sin activar' : user.active ? 'Activa' : 'Inactiva' }}</dd></div>
          <div><dt>Tipo</dt><dd>{{ user.isAdmin ? 'Equipo de plataforma' : 'Cuenta de espacio' }}</dd></div>
          <div class="ancho"><dt>Correo</dt><dd>{{ user.email || 'Sin correo' }}</dd></div>
        </dl>

        @if (!user.isAdmin) {
          <section class="bloque">
            <h3>Espacios y roles</h3>
            <ul class="lista-roles">
              @for (membership of user.spaces; track membership.id + membership.role) {
                <li><span>{{ membership.name }}</span><span class="ui-badge">{{ roleLabel(membership.role) }}</span></li>
              } @empty {
                <li class="secundario">No pertenece a ningún espacio.</li>
              }
            </ul>
          </section>

          @if (user.pending) {
            <section class="bloque">
              <h3>Invitación</h3>
              <p>La persona todavía no eligió su contraseña. Puedes reenviarle el enlace.</p>
              <button class="ui-btn ui-btn--secundario" type="button" [disabled]="saving()" (click)="sendInvitation()">Reenviar invitación</button>
            </section>
          }

          <section class="bloque">
            <h3>Acceso a la cuenta</h3>
            <p>{{ user.active ? 'Al desactivarla, la persona ya no puede iniciar sesión.' : 'Al reactivarla, la persona puede volver a iniciar sesión.' }} El motivo queda en el registro de acciones.</p>
            <input id="motivo-usuario" class="ui-input" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="Motivo del cambio" aria-label="Motivo del cambio" />
            <div class="botones">
              <button class="ui-btn" [class.ui-btn--peligro]="user.active" type="button" [disabled]="saving()" (click)="toggleActive(!user.active)">{{ user.active ? 'Desactivar cuenta' : 'Reactivar cuenta' }}</button>
            </div>
          </section>
        } @else {
          <p class="secundario">Las cuentas del equipo de plataforma no se desactivan desde este panel.</p>
        }
      }
    </app-drawer>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminUsersComponent {
  private readonly api = inject(AdminUsersApiService);
  protected readonly roleLabel = spaceRoleLabel;
  private readonly notifications = inject(NotificationService);

  protected readonly faUsers = faUsers;
  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faHourglassHalf = faHourglassHalf;
  protected readonly faShieldHalved = faShieldHalved;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faEye = faEye;

  protected readonly tabs: { id: UserFilter; label: string }[] = [
    { id: 'all', label: 'Todas' },
    { id: 'active', label: 'Activas' },
    { id: 'pending', label: 'Sin activar' },
    { id: 'inactive', label: 'Inactivas' },
  ];
  protected readonly search = signal('');
  protected readonly filter = signal<UserFilter>('all');
  // Al cambiar la búsqueda o la pestaña se vuelve a la primera página
  protected readonly page = linkedSignal({ source: () => [this.search(), this.filter()], computation: () => 1 });
  protected readonly selectedId = signal<number | null>(null);
  protected readonly reason = signal('');
  protected readonly saving = signal(false);

  // Búsqueda, pestaña y páginas van al servidor (hay miles de cuentas); se espera un momento al escribir
  protected readonly users = rxResource({
    params: () => ({ search: this.search(), filter: this.filter(), page: this.page() }),
    stream: ({ params }) => timer(params.search ? 300 : 0).pipe(switchMap(() => this.api.list(params.search, params.filter, params.page))),
    defaultValue: [],
  });
  protected readonly counts = rxResource({
    params: () => this.search(),
    stream: ({ params }) => timer(params ? 300 : 0).pipe(switchMap(() => this.api.counts(params))),
  });
  protected readonly detail = rxResource({
    params: () => this.selectedId() ?? undefined,
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly count = computed(() => {
    const c = this.counts.value();
    return { all: c?.all ?? 0, active: c?.active ?? 0, pending: c?.pending ?? 0, team: c?.team ?? 0 };
  });
  protected readonly visible = computed(() => this.users.value());
  protected readonly details = computed(() => (this.selectedId() ? this.detail.value() ?? this.users.value().find((u) => u.id === this.selectedId()) ?? null : null));

  countFor(filter: UserFilter): number {
    const c = this.counts.value();
    return c ? { all: c.all, active: c.active, pending: c.pending, inactive: c.inactive }[filter] : 0;
  }

  avatarOf(user: AdminUser): string {
    return defaultAvatar(user.id);
  }

  restOf(memberships: AdminUser['spaces']): string {
    return memberships.slice(2).map((membership) => `${membership.name} · ${spaceRoleLabel(membership.role)}`).join(', ');
  }

  open(id: number): void {
    this.selectedId.set(id);
    this.reason.set('');
  }

  changePage(delta: number): void {
    this.page.update((page) => Math.max(1, page + delta));
    this.selectedId.set(null);
  }

  async sendInvitation(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.saving.set(true);
    try {
      const { sent } = await firstValueFrom(this.api.sendInvitation(id));
      if (sent) this.notifications.success('Invitación reenviada por correo.');
      else this.notifications.error('No se pudo enviar el correo. Revisa la dirección e inténtalo de nuevo.');
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(active: boolean): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    if (!this.reason().trim()) {
      this.notifications.error('Escribe el motivo del cambio.');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.changeActive(id, active, this.reason()));
      this.notifications.success(active ? 'Cuenta reactivada.' : 'Cuenta desactivada: se cerraron sus sesiones abiertas.');
      this.reason.set('');
      this.detail.reload();
      this.users.reload();
      this.counts.reload();
    } catch (error) {
      this.notifications.error(getErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }
}
