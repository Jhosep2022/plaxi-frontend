import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faChalkboardTeacher, faHourglassHalf, faInbox, faSchool } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { spaceStatusLabel } from './admin.service';
import { spaceStatusTone } from './admin-ui';
import { AdminOverviewApiService, countSpaces } from './admin-overview-api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

// Platform overview: indicators, spaces at a glance and what needs attention
@Component({
  selector: 'app-admin-overview',
  host: { class: 'ui-pagina' },
  imports: [RouterLink, FaIconComponent, Tooltip, PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header miga="Plataforma" titulo="Resumen" descripcion="Estado general de los colegios, las academias y las solicitudes de Aulix."><button class="ui-btn ui-btn--secundario" type="button" [disabled]="overview.isLoading()" (click)="overview.reload()">Actualizar</button></app-page-header>

    @if (overview.isLoading()) { <p role="status">Actualizando el resumen…</p> }
    @if (overview.error()) {
      <div class="ui-card" role="alert"><app-empty-state kind="error" titulo="No pudimos cargar el resumen" texto="Intenta de nuevo para consultar los datos actuales.">
        <button class="ui-btn ui-btn--secundario" type="button" (click)="overview.reload()">Reintentar</button>
      </app-empty-state></div>
    } @else if (overview.hasValue()) {
    <div class="indicadores">
      <a class="ui-card indicador destacado" routerLink="/admin/schools" pTooltip="Colegios con espacio creado en Aulix" tooltipPosition="bottom">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faSchool" /></span>
        <div><strong>{{ counts().schools }}</strong><small>colegios</small></div>
      </a>
      <a class="ui-card indicador" routerLink="/admin/academies" pTooltip="Academias de docentes independientes" tooltipPosition="bottom">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faChalkboardTeacher" /></span>
        <div><strong>{{ counts().academies }}</strong><small>academias</small></div>
      </a>
      <a class="ui-card indicador" routerLink="/admin/requests" pTooltip="Colegios que pidieron Aulix y todavía no fueron contactados" tooltipPosition="bottom">
        <span class="ui-icono tono-crema"><fa-icon [icon]="faInbox" /></span>
        <div><strong>{{ counts().newRequests }}</strong><small>solicitudes nuevas</small></div>
      </a>
      <a class="ui-card indicador" routerLink="/admin/schools" pTooltip="Espacios sin acceso por falta de pago u otro motivo" tooltipPosition="bottom">
        <span class="ui-icono tono-rojo"><fa-icon [icon]="faBan" /></span>
        <div><strong>{{ counts().suspendedSpaces }}</strong><small>espacios suspendidos</small></div>
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
                <tr><td colspan="3"><app-empty-state [compact]="true" titulo="Todavía no hay espacios" texto="Los colegios y academias aparecerán aquí cuando se creen." /></td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="ui-card">
        <div class="tarjeta-titulo"><h2>Para atender</h2></div>
        <ul class="lista-atender">
          @if (counts().newRequests) {
            <li>
              <span class="ui-icono tono-crema"><fa-icon [icon]="faInbox" /></span>
              <div><strong>{{ counts().newRequests }} {{ counts().newRequests === 1 ? 'solicitud sin contactar' : 'solicitudes sin contactar' }}</strong><small>Colegios que esperan tu llamada</small></div>
              <a routerLink="/admin/requests">Atender</a>
            </li>
          }
          @if (counts().paymentsDueSoon) {
            <li><span class="ui-icono tono-azul"><fa-icon [icon]="faHourglassHalf" /></span>
              <div><strong>{{ counts().paymentsDueSoon }} pagos por vencer</strong><small>La cobertura termina en los próximos 7 días</small></div>
              <a routerLink="/admin/schools">Revisar</a>
            </li>
          }
          @for (space of blocked(); track space.id) {
            <li>
              <span class="ui-icono tono-rojo"><fa-icon [icon]="faBan" /></span>
              <div><strong>{{ space.name }}</strong><small>{{ statusLabel(space.status) }}</small></div>
              <a [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }">Revisar</a>
            </li>
          }
          @if (!counts().newRequests && !counts().paymentsDueSoon && !counts().blockedSpaces) {
            <li class="empty-state-row"><app-empty-state [compact]="true" titulo="Todo al día" texto="No hay solicitudes, pagos por vencer ni espacios bloqueados para atender." /></li>
          }
        </ul>
      </section>
    </div>
    }
  `,
  styleUrl: './admin-pages.css',
})
export class AdminOverviewComponent {
  private readonly api = inject(AdminOverviewApiService);
  protected readonly overview = rxResource({ stream: () => this.api.getOverview() });
  protected readonly statusLabel = spaceStatusLabel;
  protected readonly statusTone = spaceStatusTone;
  protected readonly faSchool = faSchool;
  protected readonly faChalkboardTeacher = faChalkboardTeacher;
  protected readonly faInbox = faInbox;
  protected readonly faBan = faBan;
  protected readonly faHourglassHalf = faHourglassHalf;

  protected readonly counts = computed(() => {
    const summary = this.overview.value()?.summary;
    return {
      schools: summary ? countSpaces(summary, 'school') : 0,
      academies: summary ? countSpaces(summary, 'academy') : 0,
      newRequests: summary?.newRequests ?? 0,
      paymentsDueSoon: summary?.paymentsDueSoon ?? 0,
      suspendedSpaces: summary ? countSpaces(summary, undefined, 'suspended') : 0,
      blockedSpaces: summary ? countSpaces(summary, undefined, 'suspended') + countSpaces(summary, undefined, 'read_only') : 0,
    };
  });
  protected readonly spaces = computed(() => (this.overview.value()?.spaces ?? []).slice(0, 6));
  protected readonly blocked = computed(() => (this.overview.value()?.spaces ?? []).filter((space) => space.status === 'suspended' || space.status === 'read_only').slice(0, 6));
}
