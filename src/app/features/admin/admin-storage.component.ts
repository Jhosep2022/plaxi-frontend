import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChalkboardTeacher, faDatabase, faHardDrive, faPen, faSchool } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-admin-storage',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, RouterLink, FaIconComponent, Tooltip],
  template: `
    <app-page-header miga="Plataforma · Operación" titulo="Almacenamiento" descripcion="Cuota de archivos de cada colegio y academia. La cuota se cambia en el detalle del espacio." />

    <div class="indicadores">
      <div class="ui-card indicador destacado">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faHardDrive" /></span>
        <div><strong>{{ totalGb() }} GB</strong><small>de cuota asignada en total</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faSchool" /></span>
        <div><strong>{{ schoolsGb() }} GB</strong><small>para colegios</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-crema"><fa-icon [icon]="faChalkboardTeacher" /></span>
        <div><strong>{{ academiesGb() }} GB</strong><small>para academias</small></div>
      </div>
      <div class="ui-card indicador" pTooltip="El consumo real se mostrará cuando el servidor mida los archivos de cada espacio" tooltipPosition="bottom">
        <span class="ui-icono"><fa-icon [icon]="faDatabase" /></span>
        <div><strong>—</strong><small>consumo real (pronto)</small></div>
      </div>
    </div>

    <div class="ui-card">
      <div class="ui-tabla-contenedor">
        <table class="ui-tabla">
          <thead><tr><th>Espacio</th><th>Cuota</th><th>Consumo</th><th></th></tr></thead>
          <tbody>
            @for (space of admin.spaces(); track space.id) {
              <tr>
                <td>
                  <div class="persona">
                    <span class="ui-icono" [class.tono-lima]="space.type === 'school'" [class.tono-azul]="space.type === 'academy'">
                      <fa-icon [icon]="space.type === 'school' ? faSchool : faChalkboardTeacher" />
                    </span>
                    <div><strong>{{ space.name }}</strong><small>{{ space.type === 'school' ? 'Colegio' : 'Academia' }}</small></div>
                  </div>
                </td>
                <td>{{ space.limits.storageGb }} GB</td>
                <td>
                  <div class="barra-uso" pTooltip="Todavía no se mide el consumo" tooltipPosition="top">
                    <div class="ui-barra"><span style="width: 0"></span></div>
                    <small>Sin datos todavía</small>
                  </div>
                </td>
                <td>
                  <div class="acciones">
                    <a class="ui-btn ui-btn--icono" [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }" [attr.aria-label]="'Cambiar la cuota de ' + space.name" pTooltip="Cambiar la cuota" tooltipPosition="left"><fa-icon [icon]="faPen" /></a>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="vacio">Todavía no hay espacios.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminStorageComponent {
  protected readonly admin = inject(AdminService);
  protected readonly faHardDrive = faHardDrive;
  protected readonly faSchool = faSchool;
  protected readonly faChalkboardTeacher = faChalkboardTeacher;
  protected readonly faDatabase = faDatabase;
  protected readonly faPen = faPen;

  private sum(type?: 'school' | 'academy'): number {
    return this.admin.spaces().filter((space) => !type || space.type === type).reduce((total, space) => total + space.limits.storageGb, 0);
  }
  protected readonly totalGb = computed(() => this.sum());
  protected readonly schoolsGb = computed(() => this.sum('school'));
  protected readonly academiesGb = computed(() => this.sum('academy'));
}
