import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faFilePdf, faImage, faInbox, faSchool, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { environment } from '../../../environments/environment';
import { SessionService } from '../../core/auth/session.service';

// GET /api/espacios/:slug/archivos/almacenamiento (management in a school, the owner teacher in an academy)
interface SpaceStorage {
  usedBytes: number;
  limitBytes: number;
  warningRatio: number;
  byPurpose: { tema: number; entrega: number; portada: number; logo: number };
}

const FREE_ACADEMY_BYTES = 1024 ** 3; // free academy plan: 1 GB (paid plan: 10 GB)

// Storage of the active space: usage bar, what takes the space and what to do when it fills up.
// Space is not sold ("uso razonable"), so the text never offers gigabytes for sale.
@Component({
  selector: 'app-storage-card',
  imports: [FaIconComponent, Tooltip],
  styles: `
    :host { display: block; }
    .cabecera { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
    .cabecera strong { font-size: 15px; color: var(--dark-blue); }
    .info { color: var(--muted); font-size: 13px; cursor: help; }
    .cifras { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .cifras b { font-size: 20px; color: var(--dark-blue); }
    .cifras span { font-size: 13px; color: var(--muted); }
    .ui-barra { height: 8px; border-radius: 4px; }
    .resto { margin: 6px 0 12px; font-size: 13px; color: var(--muted); }
    .alerta { display: flex; gap: 8px; align-items: flex-start; margin: 0 0 12px; padding: 10px 12px; border-radius: 10px; background: #fdf0ee; color: #c0392b; font-size: 13px; }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--dark-blue); }
    li .ui-icono { width: 30px; height: 30px; border-radius: 8px; font-size: 13px; }
    li span.nombre { flex: 1; }
    li small { color: var(--muted); }
    .pie { margin: 12px 0 0; font-size: 12px; color: var(--muted); line-height: 1.5; }
    .estado { font-size: 13px; color: var(--muted); }
    .tono-rojo { --tono-bar: #c0392b; }
  `,
  template: `
    @if (storage.value(); as s) {
      <div class="cabecera">
        <strong>Almacenamiento</strong>
        <fa-icon class="info" [icon]="faCircleInfo" pTooltip="Espacio que ocupan los archivos subidos: material de los temas, entregas, portadas y logo. Los videos van como enlace y no ocupan espacio." tooltipPosition="left" />
      </div>
      <div class="cifras">
        <b>{{ formatSize(s.usedBytes) }}</b>
        <span>de {{ formatSize(s.limitBytes) }} · {{ percent() }}</span>
      </div>
      <div class="ui-barra" [class.tono-rojo]="nearlyFull()" role="progressbar" [attr.aria-valuenow]="Math.round(ratio() * 100)" aria-valuemin="0" aria-valuemax="100" aria-label="Espacio usado">
        <span [style.width.%]="ratio() * 100"></span>
      </div>
      <p class="resto">Te quedan {{ formatSize(free()) }} para subir archivos.</p>

      @if (nearlyFull()) {
        <p class="alerta" role="status">
          <fa-icon [icon]="faTriangleExclamation" />
          <span>{{ isFreeAcademy() ? 'Tu academia está casi llena. Con el plan pagado tienes 10 GB.' : 'El espacio está casi lleno. Cuando se llene no se podrán subir archivos nuevos.' }}</span>
        </p>
      }

      <ul>
        @for (part of parts(); track part.label) {
          <li>
            <span [class]="'ui-icono ' + part.tone"><fa-icon [icon]="part.icon" /></span>
            <span class="nombre">{{ part.label }}</span>
            <small>{{ formatSize(part.bytes) }}</small>
          </li>
        }
      </ul>

      <p class="pie">
        @if (isFreeAcademy()) {
          Tu plan gratis incluye 1 GB. Si necesitas más, el plan pagado trae 10 GB.
        } @else {
          El espacio crece con los cupos contratados. Si necesitas más, escríbenos y lo revisamos juntos.
        }
      </p>
    } @else if (storage.error()) {
      <p class="estado" role="alert">No pudimos cargar el almacenamiento.</p>
    } @else {
      <p class="estado">Cargando el almacenamiento…</p>
    }
  `,
})
export class StorageCardComponent {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  protected readonly Math = Math;
  protected readonly faCircleInfo = faCircleInfo;
  protected readonly faTriangleExclamation = faTriangleExclamation;

  private readonly space = computed(() => this.session.activeMembership()?.espacio ?? null);
  protected readonly storage = rxResource({
    params: () => this.space()?.slug,
    stream: ({ params: slug }) => this.http.get<SpaceStorage>(`${environment.API_URL}/espacios/${slug}/archivos/almacenamiento`),
  });

  protected readonly ratio = computed(() => {
    const s = this.storage.value();
    return s && s.limitBytes ? Math.min(1, s.usedBytes / s.limitBytes) : 0;
  });
  protected readonly nearlyFull = computed(() => this.ratio() >= (this.storage.value()?.warningRatio ?? 0.8));
  protected readonly free = computed(() => {
    const s = this.storage.value();
    return s ? Math.max(0, s.limitBytes - s.usedBytes) : 0;
  });
  protected readonly isFreeAcademy = computed(() => this.space()?.tipo === 'academia' && this.storage.value()?.limitBytes === FREE_ACADEMY_BYTES);
  protected readonly percent = computed(() => {
    const ratio = this.ratio();
    return ratio > 0 && ratio < 0.01 ? 'menos de 1 %' : `${Math.round(ratio * 100)} %`;
  });
  protected readonly parts = computed(() => {
    const p = this.storage.value()?.byPurpose;
    if (!p) return [];
    const school = this.space()?.tipo === 'colegio';
    return [
      { label: 'Material de los temas', bytes: p.tema, icon: faFilePdf, tone: 'tono-azul' },
      { label: 'Entregas de tareas', bytes: p.entrega, icon: faInbox, tone: 'tono-lima' },
      { label: school ? 'Portadas de las aulas' : 'Portadas de los cursos', bytes: p.portada, icon: faImage, tone: 'tono-crema' },
      ...(school ? [{ label: 'Logo del colegio', bytes: p.logo, icon: faSchool, tone: '' }] : []),
    ];
  });

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
