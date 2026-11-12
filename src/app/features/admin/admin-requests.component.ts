import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelope, faEye, faPhone, faSchool } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/api/api-error';
import { createSlug } from '../../core/models/auth.model';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { requestStatusLabel, type AdminRequestStatus } from './admin.service';
import { AdminRequestsApiService } from './admin-requests-api.service';
import { requestStatusTone } from './admin-ui';

@Component({
  selector: 'app-admin-requests',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, DrawerComponent, FaIconComponent, Tooltip],
  template: `
    <app-page-header miga="Plataforma · Espacios" titulo="Solicitudes de colegios" descripcion="Colegios que pidieron Aulix desde la web. Llama, registra el seguimiento y, cuando estén listos, crea su espacio." />

    <div class="filtros">
      <div class="ui-tabs" role="tablist" aria-label="Filtrar solicitudes por estado">
        @for (tab of tabs; track tab.id) {
          <button type="button" class="ui-tab" role="tab" [class.activa]="statusFilter() === tab.id" [attr.aria-selected]="statusFilter() === tab.id" (click)="changeFilter(tab.id)">{{ tab.label }}</button>
        }
      </div>
    </div>

    <div class="ui-card">
      @if (requests.isLoading() && !visible().length) {
        <p class="cargando" role="status">Cargando solicitudes…</p>
      } @else if (requests.error()) {
        <p class="vacio" role="alert">No pudimos cargar las solicitudes. <button class="ui-btn ui-btn--secundario" type="button" (click)="requests.reload()">Reintentar</button></p>
      } @else {
        <div class="ui-tabla-contenedor">
          <table class="ui-tabla">
            <thead><tr><th>Colegio</th><th>Contacto</th><th>Estudiantes</th><th>Recibida</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              @for (request of visible(); track request.id) {
                <tr [class.inactivo]="request.status === 'discarded'">
                  <td>
                    <div class="persona">
                      <span class="ui-icono tono-crema"><fa-icon [icon]="faSchool" /></span>
                      <div><strong>{{ request.school }}</strong><small>{{ request.city }}</small></div>
                    </div>
                  </td>
                  <td>
                    <div class="contacto">
                      <span><strong>{{ request.contact }}</strong><span class="secundario">· {{ request.role }}</span></span>
                      @if (request.phone) { <span><fa-icon [icon]="faPhone" /> {{ request.phone }}</span> }
                      @if (request.email) { <span><fa-icon [icon]="faEnvelope" /> {{ request.email }}</span> }
                    </div>
                  </td>
                  <td>{{ request.students }}</td>
                  <td>{{ request.createdAt.slice(0, 10) }}</td>
                  <td><span [class]="statusTone(request.status)">{{ statusLabel(request.status) }}</span></td>
                  <td>
                    <div class="acciones">
                      <button type="button" class="ui-btn ui-btn--icono" (click)="selectRequest(request.id)" [attr.aria-label]="'Ver solicitud de ' + request.school" pTooltip="Ver solicitud, seguimiento y crear espacio" tooltipPosition="left">
                        <fa-icon [icon]="faEye" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="vacio">No hay solicitudes con este estado.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginas">
          <button class="ui-btn ui-btn--secundario" type="button" [disabled]="page() === 1 || requests.isLoading()" (click)="changePage(-1)">Anterior</button>
          <span>Página {{ page() }}</span>
          <button class="ui-btn ui-btn--secundario" type="button" [disabled]="visible().length < 50 || requests.isLoading()" (click)="changePage(1)">Siguiente</button>
        </div>
      }
    </div>

    <app-drawer [abierto]="!!details()" [titulo]="details()?.school ?? ''" [subtitulo]="(details()?.city ?? '') + ' · ' + (details()?.students ?? 0) + ' estudiantes'" (cerrar)="selectedId.set(null)">
      @if (details(); as request) {
        <dl class="ficha">
          <div><dt>Estado</dt><dd><span [class]="statusTone(request.status)">{{ statusLabel(request.status) }}</span></dd></div>
          <div><dt>Recibida</dt><dd>{{ request.createdAt.slice(0, 10) }}</dd></div>
          <div><dt>Persona de contacto</dt><dd>{{ request.contact }}<br /><small class="secundario">{{ request.role }}</small></dd></div>
          <div><dt>Teléfono</dt><dd>{{ request.phone || '—' }}</dd></div>
          <div class="ancho"><dt>Correo</dt><dd>{{ request.email }}</dd></div>
          <div class="ancho"><dt>Mensaje</dt><dd>{{ request.message || 'Sin mensaje adicional.' }}</dd></div>
          @if (request.adminNotes) {
            <div class="ancho"><dt>Notas de seguimiento</dt><dd>{{ request.adminNotes }}</dd></div>
          }
        </dl>
        <p class="secundario">La persona de contacto puede ser distinta de quien administrará el colegio.</p>

        @if (request.status === 'converted') {
          <section class="bloque" aria-label="Siguiente paso">
            <h3>Colegio creado</h3>
            <p>Si la persona responsable tenía una cuenta pendiente, revisa su correo de invitación. En desarrollo, los mensajes llegan a Mailpit. Después debe activar su cuenta e ingresar como dirección.</p>
          </section>
        } @else {
          <section class="bloque" aria-labelledby="follow-up-heading">
            <h3 id="follow-up-heading">Seguimiento</h3>
            <p>Registra el resultado después de hablar con el colegio. Estas acciones no envían mensajes.</p>
            <input id="follow-up-note" class="ui-input" [value]="notes()" (input)="notes.set($any($event.target).value)" placeholder="Ej. Llamé; esperan una propuesta" aria-label="Nota de seguimiento (opcional)" />
            <div class="botones">
              <button class="ui-btn ui-btn--secundario" type="button" [disabled]="saving()" (click)="review('contacted')" pTooltip="Ya hablaste con el colegio" tooltipPosition="top">Marcar como contactada</button>
              <button class="ui-btn ui-btn--peligro" type="button" [disabled]="saving()" (click)="review('discarded')" pTooltip="La marca como descartada; no la elimina" tooltipPosition="top">Descartar</button>
            </div>
          </section>

          <section class="bloque" aria-labelledby="school-setup-heading">
            <h3 id="school-setup-heading">Crear el espacio del colegio</h3>
            <p>Cuando el colegio esté listo, crea su espacio. Enviamos una invitación al correo de la persona responsable.</p>
            <div class="ui-campo">
              <label for="school-identifier">Dirección en Aulix</label>
              <input id="school-identifier" class="ui-input" [attr.aria-invalid]="showError('slug') ? 'true' : null" [value]="slug() || createSlug(request.school)" (input)="slug.set($any($event.target).value)" aria-describedby="school-identifier-help" />
              <small id="school-identifier-help" class="ui-ayuda">aulix.alclick.dev/{{ slug() || createSlug(request.school) }} · letras minúsculas, números o guiones.</small>
              @if (showError('slug')) { <span class="ui-error">{{ fieldErrors()['slug'] }}</span> }
            </div>
            <div class="botones">
              <button class="ui-btn ui-btn--secundario" type="button" (click)="useContactDetails()" pTooltip="Si la persona de contacto administrará el colegio" tooltipPosition="top">Usar los datos del contacto</button>
            </div>
            <div class="ui-fila">
              <div class="ui-campo"><label for="responsible-first-name">Nombre del responsable</label><input id="responsible-first-name" class="ui-input" [attr.aria-invalid]="showError('firstName') ? 'true' : null" [value]="directorFirstName()" (input)="directorFirstName.set($any($event.target).value)" />@if (showError('firstName')) { <span class="ui-error">{{ fieldErrors()['firstName'] }}</span> }</div>
              <div class="ui-campo"><label for="responsible-last-name">Primer apellido</label><input id="responsible-last-name" class="ui-input" [attr.aria-invalid]="showError('lastName') ? 'true' : null" [value]="directorLastName()" (input)="directorLastName.set($any($event.target).value)" />@if (showError('lastName')) { <span class="ui-error">{{ fieldErrors()['lastName'] }}</span> }</div>
            </div>
            <div class="ui-fila">
              <div class="ui-campo"><label for="responsible-email">Correo del responsable</label><input id="responsible-email" class="ui-input" [attr.aria-invalid]="showError('email') ? 'true' : null" type="email" [value]="directorEmail()" (input)="directorEmail.set($any($event.target).value)" />@if (showError('email')) { <span class="ui-error">{{ fieldErrors()['email'] }}</span> }</div>
              <div class="ui-campo"><label for="academic-year">Gestión inicial</label><input id="academic-year" class="ui-input" [attr.aria-invalid]="showError('academicYear') ? 'true' : null" type="number" min="2000" [value]="academicYear()" (input)="academicYear.set(+$any($event.target).value)" />@if (showError('academicYear')) { <span class="ui-error">{{ fieldErrors()['academicYear'] }}</span> }</div>
            </div>
            <section class="bloque" aria-labelledby="advance-heading">
              <h3 id="advance-heading">Anticipo verificado</h3>
              <p>Registra el pago recibido antes de crear el colegio. El espacio quedará activo con los cupos contratados.</p>
              <div class="ui-fila">
                <div class="ui-campo"><label for="advance-seats">Cupos contratados</label><input id="advance-seats" class="ui-input" [attr.aria-invalid]="showError('seats') ? 'true' : null" type="number" min="1" [value]="seats()" (input)="seats.set(+$any($event.target).value)" />@if (showError('seats')) { <span class="ui-error">{{ fieldErrors()['seats'] }}</span> }</div>
                <div class="ui-campo"><label for="advance-amount">Monto recibido (Bs)</label><input id="advance-amount" class="ui-input" [attr.aria-invalid]="showError('amountBs') ? 'true' : null" type="number" min="0.01" step="0.01" [value]="amountBs()" (input)="amountBs.set(+$any($event.target).value)" />@if (showError('amountBs')) { <span class="ui-error">{{ fieldErrors()['amountBs'] }}</span> }</div>
              </div>
              <div class="ui-fila">
                <div class="ui-campo"><label for="advance-date">Fecha del pago</label><input id="advance-date" class="ui-input" [attr.aria-invalid]="showError('paidAt') ? 'true' : null" type="date" [value]="paidAt()" (input)="paidAt.set($any($event.target).value)" />@if (showError('paidAt')) { <span class="ui-error">{{ fieldErrors()['paidAt'] }}</span> }</div>
                <div class="ui-campo"><label for="advance-reference">Referencia del QR</label><input id="advance-reference" class="ui-input" [attr.aria-invalid]="showError('reference') ? 'true' : null" [value]="paymentReference()" (input)="paymentReference.set($any($event.target).value)" />@if (showError('reference')) { <span class="ui-error">{{ fieldErrors()['reference'] }}</span> }</div>
              </div>
              <div class="ui-fila">
                <div class="ui-campo"><label for="advance-from">Período desde</label><input id="advance-from" class="ui-input" [attr.aria-invalid]="showError('periodFrom') ? 'true' : null" type="date" [value]="periodFrom()" (input)="periodFrom.set($any($event.target).value)" />@if (showError('periodFrom')) { <span class="ui-error">{{ fieldErrors()['periodFrom'] }}</span> }</div>
                <div class="ui-campo"><label for="advance-to">Período hasta</label><input id="advance-to" class="ui-input" [attr.aria-invalid]="showError('periodTo') ? 'true' : null" type="date" [value]="periodTo()" (input)="periodTo.set($any($event.target).value)" />@if (showError('periodTo')) { <span class="ui-error">{{ fieldErrors()['periodTo'] }}</span> }</div>
              </div>
            </section>
          </section>
        }
      }
      <ng-container pie>
        @if (details() && details()!.status !== 'converted') {
          <button class="ui-btn ui-btn--secundario" type="button" (click)="selectedId.set(null)">Cerrar</button>
          <button class="ui-btn" type="button" [disabled]="saving()" (click)="createSchool()">{{ saving() ? 'Creando…' : 'Crear espacio del colegio' }}</button>
        }
      </ng-container>
    </app-drawer>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminRequestsComponent {
  private readonly api = inject(AdminRequestsApiService);
  protected readonly statusLabel = requestStatusLabel;
  protected readonly statusTone = requestStatusTone;
  private readonly notifications = inject(NotificationService);
  protected readonly createSlug = createSlug;
  protected readonly faSchool = faSchool;
  protected readonly faPhone = faPhone;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faEye = faEye;
  protected readonly tabs: { id: AdminRequestStatus | ''; label: string }[] = [
    { id: '', label: 'Todas' },
    { id: 'new', label: 'Nuevas' },
    { id: 'contacted', label: 'Contactadas' },
    { id: 'converted', label: 'Convertidas' },
    { id: 'discarded', label: 'Descartadas' },
  ];
  protected readonly selectedId = signal<number | null>(null);
  protected readonly statusFilter = signal<AdminRequestStatus | ''>('');
  protected readonly page = signal(1);
  protected readonly saving = signal(false);
  protected readonly requests = rxResource({ params: () => ({ page: this.page(), status: this.statusFilter() }), stream: ({ params }) => this.api.list(params.page, params.status) });
  protected readonly visible = computed(() => this.requests.value() ?? []);
  protected readonly notes = signal('');
  protected readonly slug = signal('');
  protected readonly directorFirstName = signal('');
  protected readonly directorLastName = signal('');
  protected readonly directorEmail = signal('');
  protected readonly academicYear = signal(new Date().getFullYear());
  protected readonly seats = signal(0);
  protected readonly amountBs = signal(0);
  protected readonly paidAt = signal('');
  protected readonly paymentReference = signal('');
  protected readonly periodFrom = signal('');
  protected readonly periodTo = signal('');
  protected readonly details = computed(() => this.visible().find((request) => request.id === this.selectedId()) ?? null);
  protected changeFilter(status: AdminRequestStatus | ''): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.selectedId.set(null);
  }
  protected changePage(delta: number): void {
    this.page.update((page) => page + delta);
    this.selectedId.set(null);
  }
  protected selectRequest(id: number): void {
    this.selectedId.set(id);
    this.tried.set(false);
    this.notes.set('');
    this.slug.set('');
    this.directorFirstName.set('');
    this.directorLastName.set('');
    this.directorEmail.set('');
    this.academicYear.set(new Date().getFullYear());
    this.seats.set(this.details()?.students ?? 0);
    this.amountBs.set(0);
    this.paidAt.set('');
    this.paymentReference.set('');
    this.periodFrom.set('');
    this.periodTo.set('');
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

  async review(status: 'contacted' | 'discarded'): Promise<void> {
    const id = this.selectedId(); if (!id || this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.review(id, status, this.notes()));
      this.requests.reload();
      this.notifications.success(status === 'contacted' ? 'Solicitud marcada como contactada.' : 'Solicitud marcada como descartada.');
    } catch (error) {
      this.notifications.error(readApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }
  // Errors of the create-school form; they are shown (red border and message) after the first attempt
  protected readonly tried = signal(false);
  protected readonly fieldErrors = computed(() => {
    const request = this.details();
    const errors: Record<string, string> = {};
    const slug = this.slug().trim() || (request ? createSlug(request.school) : '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) errors['slug'] = 'De 3 a 40 caracteres: letras minúsculas, números o guiones.';
    if (!this.directorFirstName().trim()) errors['firstName'] = 'Escribe el nombre.';
    if (!this.directorLastName().trim()) errors['lastName'] = 'Escribe el primer apellido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.directorEmail().trim())) errors['email'] = 'Escribe un correo válido.';
    if (!Number.isInteger(this.academicYear()) || this.academicYear() < 2000) errors['academicYear'] = 'Escribe el año de la gestión.';
    if (!Number.isInteger(this.seats()) || this.seats() < 1) errors['seats'] = 'Al menos 1 cupo.';
    if (!Number.isFinite(this.amountBs()) || this.amountBs() <= 0) errors['amountBs'] = 'Escribe el monto recibido.';
    if (!this.paidAt()) errors['paidAt'] = 'Elige la fecha del pago.';
    if (!this.paymentReference().trim()) errors['reference'] = 'Escribe la referencia del QR.';
    if (!this.periodFrom()) errors['periodFrom'] = 'Elige desde cuándo cubre.';
    if (!this.periodTo()) errors['periodTo'] = 'Elige hasta cuándo cubre.';
    else if (this.periodFrom() && this.periodTo() < this.periodFrom()) errors['periodTo'] = 'Debe ser igual o posterior a «desde».';
    return errors;
  });
  protected showError(field: string): boolean {
    return this.tried() && !!this.fieldErrors()[field];
  }

  async createSchool(): Promise<void> {
    const request = this.details(); if (!request || this.saving()) return;
    const slug = this.slug().trim() || createSlug(request.school);
    this.tried.set(true);
    const missing = Object.keys(this.fieldErrors());
    if (missing.length) {
      this.notifications.error(missing.length === 1 ? 'Revisa el campo marcado en rojo.' : `Revisa los ${missing.length} campos marcados en rojo.`);
      document.querySelector<HTMLElement>('app-drawer [aria-invalid="true"]')?.focus();
      return;
    }
    this.saving.set(true);
    try {
      const result = await firstValueFrom(this.api.createSchool(request.id, { name: request.school, slug,
        directorFirstName: this.directorFirstName().trim(), directorLastName: this.directorLastName().trim(),
        directorEmail: this.directorEmail().trim(), academicYear: this.academicYear(), seats: this.seats(),
        amountBs: this.amountBs().toFixed(2), paidAt: this.paidAt(), periodFrom: this.periodFrom(),
        periodTo: this.periodTo(), paymentReference: this.paymentReference().trim() }));
      this.requests.reload();
      this.notifications.success(result.invitationSent
        ? 'Colegio creado. Enviamos la invitación al correo de la persona responsable.'
        : 'Colegio creado, pero no se pudo enviar la invitación. Revisa el correo y el servicio de envío.');
    } catch (error) {
      this.notifications.error(readApiError(error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
