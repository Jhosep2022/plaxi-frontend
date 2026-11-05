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
      @for (request of visible(); track request.id) { <tr><td><strong>{{ request.school }}</strong><br /><small>{{ request.city }}</small></td><td>{{ request.contact }}<br /><small>{{ request.email }}</small></td><td>{{ request.students }}</td><td><span class="ui-badge tono-crema">{{ statusLabel(request.status) }}</span></td><td><button class="ui-btn ui-btn--secundario" type="button" (click)="selectRequest(request.id)">Ver solicitud</button></td></tr> }
    </tbody></table></div></section>
    @if (details(); as request) { <section class="ui-card admin-section">
      <div class="admin-heading"><h2>{{ request.school }}</h2><button class="ui-btn ui-btn--secundario" type="button" (click)="selectedId.set(null)">Cerrar</button></div>
      <p>Datos de la persona que envió la solicitud. Puede ser distinta de quien administrará el colegio.</p>
      <dl class="admin-details"><div><dt>Persona de contacto</dt><dd>{{ request.contact }} · {{ request.role }}</dd></div><div><dt>Correo</dt><dd>{{ request.email }}</dd></div><div><dt>Teléfono</dt><dd>{{ request.phone }}</dd></div><div><dt>Ciudad</dt><dd>{{ request.city }}</dd></div></dl>
      <p>{{ request.message || 'Sin mensaje adicional.' }}</p>
      <div class="request-status">Estado actual: <span class="ui-badge tono-crema">{{ statusLabel(request.status) }}</span></div>
      @if (request.status !== 'converted') {
        <section class="request-step" aria-labelledby="follow-up-heading">
          <h3 id="follow-up-heading">Seguimiento de la solicitud</h3>
          <p>Registra el resultado después de hablar con el colegio. Estas acciones no envían mensajes ni realizan llamadas.</p>
          <div class="ui-campo"><label for="follow-up-note">Nota de seguimiento (opcional)</label><input id="follow-up-note" class="ui-input" [value]="notes()" (input)="notes.set($any($event.target).value)" placeholder="Ej. Llamé al colegio; esperan una propuesta" /><small class="ui-ayuda">La nota se registra cuando eliges una de las siguientes acciones.</small></div>
          <div class="request-actions">
            <div><button class="ui-btn ui-btn--secundario" type="button" (click)="review('contacted')">Marcar como contactada</button><small>Indica que ya hablaste con el colegio.</small></div>
            <div><button class="ui-btn ui-btn--peligro" type="button" (click)="review('discarded')">Descartar solicitud</button><small>Marca la solicitud como descartada; no la elimina.</small></div>
          </div>
        </section>
        <section class="request-step" aria-labelledby="school-setup-heading">
        <h3 id="school-setup-heading">Crear espacio del colegio</h3>
        <p>Cuando el colegio esté listo para comenzar, completa sus datos y crea su espacio en Aulix.</p>
        <div class="ui-campo"><label for="school-identifier">Identificador del colegio en Aulix</label><input id="school-identifier" class="ui-input" [value]="slug() || createSlug(request.school)" (input)="slug.set($any($event.target).value)" aria-describedby="school-identifier-help" /><small id="school-identifier-help" class="ui-ayuda">Identifica el espacio del colegio en Aulix. No necesita tener una página web propia; puedes usar el nombre sugerido.</small></div>
        <h3>Persona responsable del colegio</h3>
        <p>Indica quién administrará el colegio en Aulix. Puede ser la persona de contacto u otra persona.</p>
        <button class="ui-btn ui-btn--secundario" type="button" (click)="useContactDetails()">Usar los datos de la persona de contacto</button>
        <p>Si la persona de contacto administrará el colegio, puedes usar sus datos. Revisa el nombre y apellido antes de continuar; si será otra persona, escribe sus datos.</p>
        <div class="admin-forms">
          <div class="ui-campo"><label for="responsible-first-name">Nombre de la persona responsable</label><input id="responsible-first-name" class="ui-input" [value]="directorFirstName()" (input)="directorFirstName.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="responsible-last-name">Primer apellido de la persona responsable</label><input id="responsible-last-name" class="ui-input" [value]="directorLastName()" (input)="directorLastName.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="responsible-email">Correo de la persona responsable</label><input id="responsible-email" class="ui-input" type="email" [value]="directorEmail()" (input)="directorEmail.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="academic-year">Gestión académica inicial</label><input id="academic-year" class="ui-input" type="number" min="2000" [value]="academicYear()" (input)="academicYear.set(+$any($event.target).value)" /></div>
        </div>
        <div class="admin-actions"><button class="ui-btn" type="button" (click)="createSchool()">Crear espacio del colegio</button></div>
        </section>
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
  protected selectRequest(id: number): void {
    this.selectedId.set(id);
    this.notes.set('');
    this.slug.set('');
    this.directorFirstName.set('');
    this.directorLastName.set('');
    this.directorEmail.set('');
    this.academicYear.set(new Date().getFullYear());
  }

  protected useContactDetails(): void {
    const request = this.details();
    if (!request) return;
    const nameParts = request.contact.trim().split(/\s+/).filter(Boolean);
    const lastName = nameParts.length > 1 ? nameParts.pop() ?? '' : '';
    this.directorFirstName.set(nameParts.join(' '));
    this.directorLastName.set(lastName);
    this.directorEmail.set(request.email);
  }

  review(status: 'contacted' | 'discarded'): void {
    const id = this.selectedId(); if (!id) return;
    this.admin.reviewRequest(id, status, this.notes());
    this.notifications.success(status === 'contacted' ? 'Solicitud marcada como contactada.' : 'Solicitud marcada como descartada.');
  }
  createSchool(): void {
    const request = this.details(); if (!request) return;
    const slug = this.slug().trim() || createSlug(request.school);
    if (!slug || this.admin.spaces().some((space) => space.slug === slug)) { this.notifications.error('Ese identificador no está disponible. Elige otro para el colegio.'); return; }
    const created = this.admin.createSchool(request.id, { slug, directorFirstName: this.directorFirstName(),
      directorLastName: this.directorLastName(), directorEmail: this.directorEmail(),
      academicYear: this.academicYear() });
    if (!created) { this.notifications.error('Completa el nombre y apellido de la persona responsable y revisa su correo.'); return; }
    this.notifications.success('Colegio agregado a la demostración.');
  }
}
