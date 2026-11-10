import { Component, computed, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClockRotateLeft, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-admin-audit',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, FaIconComponent],
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
          <thead><tr><th>Acción</th><th>Recurso</th><th>Motivo</th><th>Fecha</th></tr></thead>
          <tbody>
            @for (entry of visible(); track entry.id) {
              <tr>
                <td>
                  <div class="persona">
                    <span class="ui-icono tono-azul"><fa-icon [icon]="faClockRotateLeft" /></span>
                    <div><strong>{{ entry.action }}</strong></div>
                  </div>
                </td>
                <td>{{ entry.entity }}</td>
                <td>{{ entry.details }}</td>
                <td class="secundario">{{ entry.createdAt.slice(0, 16).replace('T', ' ') }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="vacio">{{ search() ? 'Ningún cambio coincide con la búsqueda.' : 'Todavía no hay cambios registrados.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminAuditComponent {
  protected readonly admin = inject(AdminService);
  protected readonly faClockRotateLeft = faClockRotateLeft;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly search = signal('');
  protected readonly visible = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.admin.auditEntries().filter((entry) => !term || [entry.action, entry.entity, entry.details].some((value) => value.toLowerCase().includes(term)));
  });
}
