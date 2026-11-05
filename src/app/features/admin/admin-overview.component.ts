import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-admin-overview', host: { class: 'ui-pagina' }, imports: [RouterLink, PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma" titulo="Resumen operativo" descripcion="Estado general de los colegios, academias y solicitudes." />
    <div class="admin-grid">
      <a class="ui-card admin-metric" routerLink="/admin/schools"><small>Colegios</small><strong>{{ admin.summary().schools }}</strong><span>Ver colegios →</span></a>
      <a class="ui-card admin-metric" routerLink="/admin/academies"><small>Academias</small><strong>{{ admin.summary().academies }}</strong><span>Ver academias →</span></a>
      <a class="ui-card admin-metric" routerLink="/admin/requests"><small>Solicitudes nuevas</small><strong>{{ admin.summary().newRequests }}</strong><span>Atender solicitudes →</span></a>
      <a class="ui-card admin-metric" routerLink="/admin/schools"><small>Espacios suspendidos</small><strong>{{ admin.summary().suspendedSpaces }}</strong><span>Revisar espacios →</span></a>
    </div>
    <section class="ui-card admin-section"><h2>Accesos de operación</h2><p>Revisa la capacidad de almacenamiento, las cuentas y el historial de cambios desde el menú de administración.</p></section>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminOverviewComponent { protected readonly admin = inject(AdminService); }
