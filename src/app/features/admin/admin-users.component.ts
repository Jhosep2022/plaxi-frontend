import { Component, computed, inject, signal } from '@angular/core';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { AdminService, spaceRoleLabel } from './admin.service';

@Component({
  selector: 'app-admin-users', host: { class: 'ui-pagina' }, imports: [PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma" titulo="Usuarios" descripcion="Consulta cuentas y administra el acceso sin ver datos académicos." />
    <section class="ui-card admin-section"><div class="admin-filters"><input class="ui-input" aria-label="Buscar usuarios" placeholder="Nombre, usuario o correo" [value]="search()" (input)="search.set($any($event.target).value)" /></div>
      <div class="ui-tabla-contenedor"><table class="ui-tabla"><thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Estado</th><th></th></tr></thead><tbody>
        @for (user of visible(); track user.id) { <tr><td>{{ user.firstName }} {{ user.lastName }}</td><td>{{ user.username }}</td><td>{{ user.email }}</td><td><span class="ui-badge" [class.tono-lima]="user.active" [class.tono-crema]="!user.active">{{ user.active ? 'Activo' : 'Inactivo' }}</span></td><td><button class="ui-btn ui-btn--secundario" type="button" (click)="selectedId.set(user.id)">Ver cuenta</button></td></tr> }
      </tbody></table></div>
      @if (!visible().length) { <p class="admin-empty">No se encontraron cuentas.</p> }
    </section>
    @if (details(); as user) { <section class="ui-card admin-section"><div class="admin-heading"><h2>{{ user.firstName }} {{ user.lastName }}</h2><button class="ui-btn ui-btn--secundario" type="button" (click)="selectedId.set(null)">Cerrar</button></div>
      <dl class="admin-details"><div><dt>Usuario</dt><dd>{{ user.username }}</dd></div><div><dt>Correo</dt><dd>{{ user.email }}</dd></div><div><dt>Tipo</dt><dd>{{ user.isAdmin ? 'Equipo de plataforma' : 'Cuenta de espacio' }}</dd></div></dl>
      @if (!user.isAdmin) {
        <h3>Espacios y roles</h3><ul>@for (membership of admin.spacesForUser(user.id); track membership.name + membership.role) { <li>{{ membership.name }} · {{ roleLabel(membership.role) }}</li> }</ul>
        @if (user.pending) { <div class="admin-actions"><button class="ui-btn ui-btn--secundario" type="button" (click)="sendInvitation()">Reenviar invitación</button></div> } <div class="ui-campo"><label for="motivo-usuario">Motivo del cambio</label><input id="motivo-usuario" class="ui-input" [value]="reason()" (input)="reason.set($any($event.target).value)" /></div>
        <div class="admin-actions"><button class="ui-btn" [class.ui-btn--peligro]="user.active" type="button" (click)="toggleActive(!user.active)">{{ user.active ? 'Desactivar cuenta' : 'Reactivar cuenta' }}</button></div> }
    </section> }
  `,
  styleUrl: './admin-pages.css',
})
export class AdminUsersComponent {
  protected readonly admin = inject(AdminService);
  protected readonly roleLabel = spaceRoleLabel;
  private readonly notifications = inject(NotificationService);
  protected readonly search = signal('');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly reason = signal('');
  protected readonly visible = computed(() => this.admin.users().filter((user) => {
    const term = this.search().trim().toLowerCase();
    return !term || [user.firstName, user.lastName, user.username, user.email].some((value) => value.toLowerCase().includes(term));
  }));
  protected readonly details = computed(() => this.admin.users().find((user) => user.id === this.selectedId()) ?? null);
  sendInvitation(): void {
    const id = this.selectedId();
    if (id && this.admin.resendInvitation(id)) this.notifications.success('Invitación simulada en esta demostración.');
  }
  toggleActive(active: boolean): void {
    const id = this.selectedId(); if (!id) return;
    if (!this.reason().trim()) { this.notifications.error('Escribe el motivo del cambio.'); return; }
    this.admin.changeUserActive(id, active, this.reason());
    this.notifications.success('Cuenta actualizada.');
  }
}
