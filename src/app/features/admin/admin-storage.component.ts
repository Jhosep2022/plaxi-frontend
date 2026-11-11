import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChalkboardTeacher, faDatabase, faHardDrive, faPen, faSchool, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { environment } from '../../../environments/environment';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

// What GET /api/admin/spaces returns about storage (metadata only, never the files)
interface SpaceStorage {
  id: number;
  name: string;
  type: 'school' | 'academy';
  storage: { usedBytes: number; limitBytes: number };
}

const WARNING_RATIO = 0.8; // same threshold as the backend warning to management

@Component({
  selector: 'app-admin-storage',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, RouterLink, FaIconComponent, Tooltip],
  template: `
    <app-page-header miga="Plataforma · Operación" titulo="Almacenamiento" descripcion="Espacio ocupado por los archivos de cada colegio y academia. Al llegar al 80 % avisamos a su dirección o a su docente." />

    <div class="indicadores">
      <div class="ui-card indicador destacado" pTooltip="Suma de los archivos guardados por todos los espacios" tooltipPosition="bottom">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faDatabase" /></span>
        <div><strong>{{ formatSize(totals().used) }}</strong><small>ocupados en total</small></div>
      </div>
      <div class="ui-card indicador" pTooltip="Suma de las cuotas de todos los espacios" tooltipPosition="bottom">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faHardDrive" /></span>
        <div><strong>{{ formatSize(totals().limit) }}</strong><small>de cuota asignada</small></div>
      </div>
      <div class="ui-card indicador" pTooltip="Espacios que ya usan el 80 % o más de su cuota" tooltipPosition="bottom">
        <span class="ui-icono" [class.tono-rojo]="totals().nearlyFull" [class.tono-crema]="!totals().nearlyFull"><fa-icon [icon]="faTriangleExclamation" /></span>
        <div><strong>{{ totals().nearlyFull }}</strong><small>cerca de llenarse</small></div>
      </div>
    </div>

    <div class="ui-card">
      @if (spaces.isLoading() && !spaces.value().length) {
        <p class="cargando" role="status">Cargando el almacenamiento…</p>
      } @else if (spaces.error()) {
        <p class="vacio" role="alert">No pudimos cargar el almacenamiento. <button class="ui-btn ui-btn--secundario" type="button" (click)="spaces.reload()">Reintentar</button></p>
      } @else {
        <div class="ui-tabla-contenedor">
          <table class="ui-tabla">
            <thead><tr><th>Espacio</th><th>Consumo</th><th>Cuota</th><th></th></tr></thead>
            <tbody>
              @for (space of sorted(); track space.id) {
                @let ratio = ratioOf(space);
                <tr>
                  <td>
                    <div class="persona">
                      <span class="ui-icono" [class.tono-lima]="space.type === 'school'" [class.tono-azul]="space.type === 'academy'">
                        <fa-icon [icon]="space.type === 'school' ? faSchool : faChalkboardTeacher" />
                      </span>
                      <div><strong>{{ space.name }}</strong><small>{{ space.type === 'school' ? 'Colegio' : 'Academia' }}</small></div>
                    </div>
                  </td>
                  <td>
                    <div class="barra-uso" [pTooltip]="formatSize(space.storage.usedBytes) + ' de ' + formatSize(space.storage.limitBytes)" tooltipPosition="top">
                      <div class="ui-barra" [class.tono-rojo]="ratio >= warningRatio"><span [style.width.%]="ratio * 100"></span></div>
                      <small>{{ percent(ratio) }} · {{ formatSize(space.storage.usedBytes) }}@if (ratio >= warningRatio) { · sobre el 80 % }</small>
                    </div>
                  </td>
                  <td>{{ formatSize(space.storage.limitBytes) }}</td>
                  <td>
                    <div class="acciones">
                      <a class="ui-btn ui-btn--icono" [routerLink]="space.type === 'school' ? '/admin/schools' : '/admin/academies'" [queryParams]="{ space: space.id }" [attr.aria-label]="'Cambiar la cuota de ' + space.name" pTooltip="Cambiar la cuota" tooltipPosition="left">
                        <fa-icon [icon]="faPen" />
                      </a>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="vacio">Todavía no hay espacios.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="paginas">
          <button class="ui-btn ui-btn--secundario" type="button" [disabled]="page() === 1 || spaces.isLoading()" (click)="page.update((p) => p - 1)">Anterior</button>
          <span>Página {{ page() }}</span>
          <button class="ui-btn ui-btn--secundario" type="button" [disabled]="spaces.value().length < 50 || spaces.isLoading()" (click)="page.update((p) => p + 1)">Siguiente</button>
        </div>
      }
    </div>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminStorageComponent {
  private readonly http = inject(HttpClient);
  protected readonly faHardDrive = faHardDrive;
  protected readonly faSchool = faSchool;
  protected readonly faChalkboardTeacher = faChalkboardTeacher;
  protected readonly faDatabase = faDatabase;
  protected readonly faPen = faPen;
  protected readonly faTriangleExclamation = faTriangleExclamation;
  protected readonly warningRatio = WARNING_RATIO;

  protected readonly page = signal(1);
  protected readonly spaces = rxResource({
    params: () => ({ page: this.page() }),
    stream: ({ params }) =>
      this.http.get<SpaceStorage[]>(`${environment.API_URL}/admin/spaces`, { params: new HttpParams().set('page', params.page) }),
    defaultValue: [],
  });
  // The fullest first, so whatever needs attention is on top
  protected readonly sorted = computed(() => [...this.spaces.value()].sort((a, b) => this.ratioOf(b) - this.ratioOf(a)));
  protected readonly totals = computed(() => {
    const spaces = this.spaces.value();
    return {
      used: spaces.reduce((total, space) => total + space.storage.usedBytes, 0),
      limit: spaces.reduce((total, space) => total + space.storage.limitBytes, 0),
      nearlyFull: spaces.filter((space) => this.ratioOf(space) >= WARNING_RATIO).length,
    };
  });

  ratioOf(space: SpaceStorage): number {
    return space.storage.limitBytes ? Math.min(1, space.storage.usedBytes / space.storage.limitBytes) : 0;
  }

  percent(ratio: number): string {
    return ratio > 0 && ratio < 0.01 ? 'menos de 1 %' : `${Math.round(ratio * 100)} %`;
  }

  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${value.toLocaleString('es-BO', { maximumFractionDigits: unit >= 3 ? 1 : 0 })} ${units[unit]}`;
  }
}
