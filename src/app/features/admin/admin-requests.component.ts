import { Component, computed, inject, signal } from '@angular/core';
import { createSlug } from '../../core/models/auth.model';
import { NotificationService } from '../../shared/ui/notification.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService, requestStatusLabel } from './admin.service';

@Component({
  selector: 'app-admin-requests', host: { class: 'ui-pagina' }, imports: [PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma" titulo="Solicitudes de colegios" descripcion="Da seguimiento a cada contacto antes de crear el espacio." />
    <section class="ui-card admin-section"><div class="admin-filters"><select class="ui-input" aria-label="Filtrar solicitudes" [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)"><option value="">Todos los estados</option><option value="new">Nuevas</option><option value="contacted">Contactadas</option><option value="converted">Convertidas</option><option value="discarded">Descartadas</option></select></div><div class="ui-tabla-contenedor"><table class="ui-tabla"><thead><tr><th>Colegio</th><th>Contacto</th><th>Estudiantes</th><th>Estado</th><th></th></tr></thead><tbody>
      @for (request of visible(); track request.id) { <tr><td><strong>{{ request.school }}</strong><br /><small>{{ request.city }}</small></td><td>{{ request.contact }}<br /><small>{{ request.email }}</small></td><td>{{ request.students }}</td><td><span class="ui-badge tono-crema">{{ statusLabel(request.status) }}</span></td><td><button class="ui-btn ui-btn--secundario" type="button" (click)="selectedId.set(request.id)">Ver solicitud</button></td></tr> }
    </tbody></table></div></section>
    @if (details(); as request) { <section class="ui-card admin-section">
      <div class="admin-heading"><h2>{{ request.school }}</h2><button class="ui-btn ui-btn--secundario" type="button" (click)="selectedId.set(null)">Cerrar</button></div>
      <dl class="admin-details"><div><dt>Contacto</dt><dd>{{ request.contact }} · {{ request.role }}</dd></div><div><dt>Correo</dt><dd>{{ request.email }}</dd></div><div><dt>Teléfono</dt><dd>{{ request.phone }}</dd></div><div><dt>Ciudad</dt><dd>{{ request.city }}</dd></div></dl>
      <p>{{ request.message || 'Sin mensaje adicional.' }}</p>
      @if (request.status !== 'converted') {
        <div class="ui-campo"><label for="nota-solicitud">Nota de seguimiento</label><input id="nota-solicitud" class="ui-input" [value]="notes()" (input)="notes.set($any($event.target).value)" placeholder="Ej. llamada realizada, próximos pasos" /></div>
        <div class="admin-actions"><button class="ui-btn ui-btn--secundario" type="button" (click)="review('contacted')">Marcar contactado</button><button class="ui-btn ui-btn--peligro" type="button" (click)="review('discarded')">Descartar</button></div>
        <div class="ui-campo"><label for="slug-colegio">Dirección web del colegio</label><input id="slug-colegio" class="ui-input" [value]="slug() || createSlug(request.school)" (input)="slug.set($any($event.target).value)" /></div>
        <div class="admin-forms">
          <div class="ui-campo"><label for="direccion-nombre">Nombre de la dirección</label><input id="direccion-nombre" class="ui-input" [value]="directorFirstName()" (input)="directorFirstName.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="direccion-apellido">Primer apellido</label><input id="direccion-apellido" class="ui-input" [value]="directorLastName()" (input)="directorLastName.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="direccion-correo">Correo de invitación</label><input id="direccion-correo" class="ui-input" type="email" [value]="directorEmail() || request.email" (input)="directorEmail.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="gestion-anio">Gestión inicial</label><input id="gestion-anio" class="ui-input" type="number" min="2000" [value]="academicYear()" (input)="academicYear.set(+$any($event.target).value)" /></div>
        </div>
        <div class="admin-actions"><button class="ui-btn" type="button" (click)="createSchool()">Dar de alta colegio</button></div>
      }
    </section> }
  `,
  styleUrl: './admin-pages.css',
})
export class AdminRequestsComponent {
  protected readonly admin = inject(AdminService);
  protected readonly statusLabel = requestStatusLabel;
  private readonly notifications = inject(NotificationService);
  protected readonly createSlug = createSlug;
  protected readonly selectedId = signal<number | null>(null);
  protected readonly statusFilter = signal('');
  protected readonly visible = computed(() => this.admin.requests().filter((request) => !this.statusFilter() || request.status === this.statusFilter()));
  protected readonly notes = signal('');
  protected readonly slug = signal('');
  protected readonly directorFirstName = signal('');
  protected readonly directorLastName = signal('');
  protected readonly directorEmail = signal('');
  protected readonly academicYear = signal(new Date().getFullYear());
  protected readonly details = computed(() => this.admin.requests().find((request) => request.id === this.selectedId()) ?? null);
  review(status: 'contacted' | 'discarded'): void {
    const id = this.selectedId(); if (!id) return;
    this.admin.reviewRequest(id, status, this.notes());
    this.notifications.success('Solicitud actualizada.');
  }
  createSchool(): void {
    const request = this.details(); if (!request) return;
    const slug = this.slug().trim() || createSlug(request.school);
    if (!slug || this.admin.spaces().some((space) => space.slug === slug)) { this.notifications.error('Esa dirección web no está disponible.'); return; }
    const created = this.admin.createSchool(request.id, { slug, directorFirstName: this.directorFirstName(),
      directorLastName: this.directorLastName(), directorEmail: this.directorEmail() || request.email,
      academicYear: this.academicYear() });
    if (!created) { this.notifications.error('Completa los datos de la dirección y revisa el correo.'); return; }
    this.notifications.success('Colegio agregado a la demostración.');
  }
}
