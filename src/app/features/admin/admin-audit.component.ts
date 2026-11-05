import { Component, inject } from '@angular/core';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService } from './admin.service';

@Component({ selector: 'app-admin-audit', host: { class: 'ui-pagina' }, imports: [PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma" titulo="Registro de acciones" descripcion="Cambios realizados desde el panel de administración." />
    <section class="ui-card admin-section"><div class="ui-tabla-contenedor"><table class="ui-tabla"><thead><tr><th>Fecha</th><th>Acción</th><th>Recurso</th><th>Detalle</th></tr></thead><tbody>
      @for (entry of admin.auditEntries(); track entry.id) { <tr><td>{{ entry.createdAt }}</td><td>{{ entry.action }}</td><td>{{ entry.entity }}</td><td>{{ entry.details }}</td></tr> }
    </tbody></table></div>@if (!admin.auditEntries().length) { <p class="admin-empty">Todavía no hay cambios registrados en esta demostración.</p> }</section>
  `, styleUrl: './admin-pages.css' })
export class AdminAuditComponent { protected readonly admin = inject(AdminService); }
