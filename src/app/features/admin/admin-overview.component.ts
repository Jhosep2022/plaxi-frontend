import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faChalkboardTeacher, faHourglassHalf, faInbox, faSchool } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AdminService, spaceStatusLabel } from './admin.service';
import { spaceStatusTone } from './admin-ui';

// Platform overview: indicators, spaces at a glance and what needs attention
@Component({
  selector: 'app-admin-overview',
  host: { class: 'ui-pagina' },
  imports: [RouterLink, FaIconComponent, Tooltip, PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma" titulo="Resumen" descripcion="Estado general de los colegios, las academias y las solicitudes de Aulix." />

    <div class="indicadores">
      <a class="ui-card indicador destacado" routerLink="/admin/schools" pTooltip="Colegios con espacio creado en Aulix" tooltipPosition="bottom">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faSchool" /></span>
        <div><strong>{{ admin.summary().schools }}</strong><small>colegios</small></div>
      </a>
      <a class="ui-card indicador" routerLink="/admin/academies" pTooltip="Academias de docentes independientes" tooltipPosition="bottom">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faChalkboardTeacher" /></span>
        <div><strong>{{ admin.summary().academies }}</strong><small>academias</small></div>
      </a>
      <a class="ui-card indicador" routerLink="/admin/requests" pTooltip="Colegios que pidieron Aulix y todavía no fueron contactados" tooltipPosition="bottom">
        <span class="ui-icono tono-crema"><fa-icon [icon]="faInbox" /></span>
        <div><strong>{{ admin.summary().newRequests }}</strong><small>solicitudes nuevas</small></div>
      </a>
      <a class="ui-card indicador" routerLink="/admin/schools" pTooltip="Espacios sin acceso por falta de pago u otro motivo" tooltipPosition="bottom">
        <span class="ui-icono tono-rojo"><fa-icon [icon]="faBan" /></span>
        <div><strong>{{ admin.summary().suspendedSpaces }}</strong><small>espacios suspendidos</small></div>
      </a>
    </div>

    <div class="dos-columnas">
      <section class="ui-card">
        <div class="tarjeta-titulo"><h2>Espacios</h2><a routerLink="/admin/schools">Ver todos →</a></div>
        <div class="ui-tabla-contenedor">
          <table class="ui-tabla">
            <thead><tr><th>Espacio</th><th>Estado</th><th>Miembros</th></tr></thead>
            <tbody>
              @for (space of spaces(); track space.id) {
                <tr>
                  <td>
                    <a class="persona" [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }">
                      <span class="ui-icono" [class.tono-lima]="space.type === 'school'" [class.tono-azul]="space.type === 'academy'">
                        <fa-icon [icon]="space.type === 'school' ? faSchool : faChalkboardTeacher" />
                      </span>
                      <div><strong>{{ space.name }}</strong><small>{{ space.type === 'school' ? 'Colegio' : 'Academia' }}</small></div>
                    </a>
                  </td>
                  <td><span class="ui-badge" [class]="statusTone(space.status)">{{ statusLabel(space.status) }}</span></td>
                  <td>{{ space.memberCount }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="vacio">Todavía no hay espacios.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="ui-card">
        <div class="tarjeta-titulo"><h2>Para atender</h2></div>
        <ul class="lista-atender">
          @if (admin.summary().newRequests) {
            <li>
              <span class="ui-icono tono-crema"><fa-icon [icon]="faInbox" /></span>
              <div><strong>{{ admin.summary().newRequests }} {{ admin.summary().newRequests === 1 ? 'solicitud sin contactar' : 'solicitudes sin contactar' }}</strong><small>Colegios que esperan tu llamada</small></div>
              <a routerLink="/admin/requests">Atender</a>
            </li>
          }
          @for (space of trials(); track space.id) {
            <li>
              <span class="ui-icono tono-azul"><fa-icon [icon]="faHourglassHalf" /></span>
              <div><strong>{{ space.name }}</strong><small>Prueba hasta {{ space.trialEndsOn }}</small></div>
              <a [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }">Revisar</a>
            </li>
          }
          @for (space of blocked(); track space.id) {
            <li>
              <span class="ui-icono tono-rojo"><fa-icon [icon]="faBan" /></span>
              <div><strong>{{ space.name }}</strong><small>{{ statusLabel(space.status) }}</small></div>
              <a [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }">Revisar</a>
            </li>
          }
          @if (!admin.summary().newRequests && !trials().length && !blocked().length) {
            <li class="vacio">Todo al día: no hay nada pendiente.</li>
          }
        </ul>
      </section>
    </div>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminOverviewComponent {
  protected readonly admin = inject(AdminService);
  protected readonly statusLabel = spaceStatusLabel;
  protected readonly statusTone = spaceStatusTone;
  protected readonly faSchool = faSchool;
  protected readonly faChalkboardTeacher = faChalkboardTeacher;
  protected readonly faInbox = faInbox;
  protected readonly faBan = faBan;
  protected readonly faHourglassHalf = faHourglassHalf;

  protected readonly spaces = computed(() => this.admin.spaces().slice(0, 6));
  protected readonly trials = computed(() => this.admin.spaces().filter((space) => space.status === 'trial' && space.trialEndsOn));
  protected readonly blocked = computed(() => this.admin.spaces().filter((space) => space.status === 'suspended' || space.status === 'read_only'));
}
