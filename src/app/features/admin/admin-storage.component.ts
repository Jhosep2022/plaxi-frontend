import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService } from './admin.service';

@Component({ selector: 'app-admin-storage', host: { class: 'ui-pagina' }, imports: [PageHeaderComponent, RouterLink],
  template: `
    <app-page-header miga="Plataforma" titulo="Almacenamiento" descripcion="Consulta las cuotas de almacenamiento por colegio y academia." />
    <section class="ui-card admin-section"><div class="ui-tabla-contenedor"><table class="ui-tabla"><thead><tr><th>Espacio</th><th>Tipo</th><th>Cuota</th><th>Consumo</th><th></th></tr></thead><tbody>
      @for (space of admin.spaces(); track space.id) { <tr><td>{{ space.name }}</td><td>{{ space.type === 'school' ? 'Colegio' : 'Academia' }}</td><td>{{ space.limits.storageGb }} GB</td><td>No disponible</td><td><a class="admin-link" [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }">Ver detalle</a></td></tr> }
    </tbody></table></div></section>
  `, styleUrl: './admin-pages.css' })
export class AdminStorageComponent { protected readonly admin = inject(AdminService); }
