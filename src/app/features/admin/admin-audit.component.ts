import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClockRotateLeft, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import type { AdminAuditEntry } from './admin.service';
import { AdminUsersApiService } from './admin-users-api.service';

// Nombre legible de cada acción del panel
const ACCIONES: Record<string, string> = {
  change_user_active: 'Acceso de la cuenta',
  resend_invitation: 'Invitación reenviada',
  change_space_status: 'Estado del espacio',
  change_space_plan: 'Plan del espacio',
  change_space_limits: 'Límites del espacio',
  create_school: 'Colegio creado',
  register_school_advance: 'Anticipo registrado',
  review_school_request: 'Solicitud revisada',
};
const RECURSOS: Record<string, string> = { user: 'Cuenta', space: 'Espacio', school_request: 'Solicitud' };

@Component({
  selector: 'app-admin-audit',
  host: { class: 'ui-pagina' },
  imports: [EmptyStateComponent, PageHeaderComponent, FaIconComponent],
  template: `
    <app-page-header miga="Plataforma · Operación" titulo="Registro de acciones" descripcion="Cada cambio hecho desde este panel, con su motivo. Sirve para saber quién cambió qué y por qué." />

    <div class="filtros">
      <label class="buscar">
        <fa-icon [icon]="faMagnifyingGlass" />
        <input class="ui-input" placeholder="Buscar por acción, recurso o motivo" [value]="search()" (input)="search.set($any($event.target).value)" aria-label="Buscar en el registro" />
      </label>
    </div>

    <div class="ui-card">
      <div class="ui-tabla-contenedor">
        <table class="ui-tabla">
          <thead><tr><th>Acción</th><th>Recurso</th><th>Detalle</th><th>Quién</th><th>Fecha</th></tr></thead>
          <tbody>
            @for (entry of visible(); track entry.id) {
              <tr>
                <td>
                  <div class="persona">
                    <span class="ui-icono tono-azul"><fa-icon [icon]="faClockRotateLeft" /></span>
                    <div><strong>{{ entry.accion }}</strong></div>
                  </div>
                </td>
                <td>{{ entry.recurso }}</td>
                <td>{{ entry.detalle }}</td>
                <td class="secundario">&#64;{{ entry.adminUsername }}</td>
                <td class="secundario">{{ entry.fecha }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="vacio"><app-empty-state [compact]="true" [titulo]="search() ? 'No encontramos cambios' : 'Todavía no hay cambios registrados'" texto="Las acciones administrativas aparecerán aquí con su fecha y motivo." /></td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="paginas"><button type="button" class="ui-btn ui-btn--secundario" [disabled]="page() === 1" (click)="page.set(page() - 1)">Anterior</button><span>Página {{ page() }}</span><button type="button" class="ui-btn ui-btn--secundario" [disabled]="(entries.value() ?? []).length < 50" (click)="page.set(page() + 1)">Siguiente</button></div>
    </div>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminAuditComponent {
  private readonly api = inject(AdminUsersApiService);
  protected readonly faClockRotateLeft = faClockRotateLeft;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly entries = rxResource({ params: () => this.page(), stream: ({ params }) => this.api.audit(params), defaultValue: [] });

  // La búsqueda filtra la página que se ve (50 acciones por página)
  protected readonly visible = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.entries
      .value()
      .map(vista)
      .filter((entry) => !term || [entry.accion, entry.recurso, entry.detalle, entry.adminUsername].some((value) => value.toLowerCase().includes(term)));
  });
}

function vista(entry: AdminAuditEntry) {
  const d = entry.details;
  const cambio = d['previous'] !== undefined && d['current'] !== undefined ? `${texto(d['previous'])} → ${texto(d['current'])}` : '';
  const motivo = typeof d['reason'] === 'string' && d['reason'] ? `Motivo: ${d['reason']}` : '';
  const envio = entry.action === 'resend_invitation' ? (d['sent'] ? 'Correo enviado' : 'El correo no salió') : '';
  return {
    ...entry,
    accion: ACCIONES[entry.action] ?? entry.action,
    recurso: `${RECURSOS[entry.entity] ?? entry.entity} · ${entry.entityName ?? '#' + entry.entityId}`,
    detalle: [cambio, motivo, envio].filter(Boolean).join(' · ') || '—',
    fecha: new Date(entry.createdAt).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }),
  };
}

function texto(valor: unknown): string {
  if (valor === true) return 'activa';
  if (valor === false) return 'inactiva';
  const nombres: Record<string, string> = { active: 'activo', read_only: 'solo lectura', suspended: 'suspendido', free: 'gratis', paid: 'pagado', new: 'nueva', contacted: 'contactado', converted: 'convertido', discarded: 'descartado' };
  return typeof valor === 'string' ? (nombres[valor] ?? valor) : typeof valor === 'object' ? '' : String(valor);
}
