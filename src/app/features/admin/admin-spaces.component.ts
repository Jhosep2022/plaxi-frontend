import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBan, faChalkboardTeacher, faCircleCheck, faHourglassHalf, faMagnifyingGlass, faPen, faSchool } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { AdminService, spaceStatusLabel, type AdminSpaceStatus } from './admin.service';
import { spaceStatusTone } from './admin-ui';
import { SELECT } from '../../shared/ui/select.component';

type StatusFilter = AdminSpaceStatus | '';

@Component({
  selector: 'app-admin-spaces',
  host: { class: 'ui-pagina' },
  imports: [...SELECT, FaIconComponent, Tooltip, DrawerComponent, PageHeaderComponent],
  template: `
    <app-page-header [miga]="'Plataforma · Espacios'" [titulo]="title()" [descripcion]="description()" />

    <div class="indicadores">
      <div class="ui-card indicador destacado">
        <span class="ui-icono tono-lima"><fa-icon [icon]="isSchool() ? faSchool : faChalkboardTeacher" /></span>
        <div><strong>{{ count().all }}</strong><small>{{ isSchool() ? 'colegios' : 'academias' }} en total</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faCircleCheck" /></span>
        <div><strong>{{ count().active }}</strong><small>activos</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-crema"><fa-icon [icon]="faHourglassHalf" /></span>
        <div><strong>{{ count().trial }}</strong><small>en prueba</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-rojo"><fa-icon [icon]="faBan" /></span>
        <div><strong>{{ count().blocked }}</strong><small>suspendidos o solo lectura</small></div>
      </div>
    </div>

    <div class="filtros">
      <label class="buscar">
        <fa-icon [icon]="faMagnifyingGlass" />
        <input class="ui-input" [placeholder]="'Buscar ' + (isSchool() ? 'colegio' : 'academia') + ' por nombre'" [value]="search()" (input)="search.set($any($event.target).value)" aria-label="Buscar espacios" />
      </label>
      <div class="ui-tabs" role="tablist" aria-label="Filtrar por estado">
        @for (tab of tabs; track tab.id) {
          <button type="button" class="ui-tab" role="tab" [class.activa]="statusFilter() === tab.id" [attr.aria-selected]="statusFilter() === tab.id" (click)="statusFilter.set(tab.id)">
            {{ tab.label }} <span class="contador">{{ countFor(tab.id) }}</span>
          </button>
        }
      </div>
    </div>

    <div class="ui-card">
      <div class="ui-tabla-contenedor">
        <table class="ui-tabla">
          <thead><tr><th>{{ isSchool() ? 'Colegio' : 'Academia' }}</th><th>Estado</th><th>Miembros</th><th>Prueba hasta</th><th>Límites</th><th></th></tr></thead>
          <tbody>
            @for (space of visible(); track space.id) {
              <tr [class.inactivo]="space.status === 'suspended'">
                <td>
                  <div class="persona">
                    <span class="ui-icono" [class.tono-lima]="isSchool()" [class.tono-azul]="!isSchool()"><fa-icon [icon]="isSchool() ? faSchool : faChalkboardTeacher" /></span>
                    <div><strong>{{ space.name }}</strong><small>aulix.alclick.dev/{{ space.slug }}</small></div>
                  </div>
                </td>
                <td><span [class]="statusTone(space.status)">{{ statusLabel(space.status) }}</span></td>
                <td>{{ space.memberCount }}</td>
                <td>{{ space.trialEndsOn || '—' }}</td>
                <td>
                  <div class="chips">
                    <span class="ui-badge" pTooltip="Estudiantes como máximo" tooltipPosition="top">{{ space.limits.students }} est.</span>
                    @if (!isSchool()) { <span class="ui-badge" pTooltip="Cursos como máximo" tooltipPosition="top">{{ space.limits.courses }} cursos</span> }
                    <span class="ui-badge" pTooltip="Almacenamiento máximo" tooltipPosition="top">{{ space.limits.storageGb }} GB</span>
                  </div>
                </td>
                <td>
                  <div class="acciones">
                    <button type="button" class="ui-btn ui-btn--icono" (click)="openDetails(space.id)" [attr.aria-label]="'Administrar ' + space.name" pTooltip="Estado, prueba y límites" tooltipPosition="left"><fa-icon [icon]="faPen" /></button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="vacio">No hay {{ isSchool() ? 'colegios' : 'academias' }} que coincidan con la búsqueda.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <app-drawer [abierto]="!!details()" [titulo]="details()?.name ?? ''" [subtitulo]="(isSchool() ? 'Colegio' : 'Academia') + ' · ' + (details()?.memberCount ?? 0) + ' miembros'" (cerrar)="selectedId.set(null)">
      @if (details(); as space) {
        <dl class="ficha">
          <div><dt>Estado actual</dt><dd><span [class]="statusTone(space.status)">{{ statusLabel(space.status) }}</span></dd></div>
          <div><dt>Prueba hasta</dt><dd>{{ space.trialEndsOn || 'Sin prueba' }}</dd></div>
          <div class="ancho"><dt>Dirección en Aulix</dt><dd>aulix.alclick.dev/{{ space.slug }}</dd></div>
          <div class="ancho"><dt>Consumo de almacenamiento</dt><dd>No disponible todavía · cuota de {{ space.limits.storageGb }} GB</dd></div>
        </dl>

        <section class="bloque">
          <h3>Motivo del cambio</h3>
          <p>Cada cambio queda en el registro de acciones con este motivo.</p>
          <input id="motivo-admin" class="ui-input" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="Ej. Pagó la cuota de noviembre" aria-label="Motivo del cambio" />
        </section>

        <section class="bloque">
          <h3>Estado</h3>
          <p>Solo lectura deja ver sin modificar; suspendido corta el acceso.</p>
          <app-select inputId="estado-admin" [value]="newStatus()" (valueChange)="newStatus.set($any($event))" ariaLabel="Nuevo estado">
            <app-option [value]="'active'" [label]="'Activo'" /><app-option [value]="'read_only'" [label]="'Solo lectura'" /><app-option [value]="'suspended'" [label]="'Suspendido'" />
          </app-select>
          <div class="botones"><button class="ui-btn" type="button" (click)="saveStatus()">Guardar estado</button></div>
        </section>

        <section class="bloque">
          <h3>Prueba gratuita</h3>
          <p>Extiende la fecha si el {{ isSchool() ? 'colegio' : 'docente' }} necesita más tiempo para decidir.</p>
          <input id="prueba-admin" class="ui-input" type="date" [value]="newTrialDate() || space.trialEndsOn || ''" (change)="newTrialDate.set($any($event.target).value)" aria-label="Prueba hasta" />
          <div class="botones"><button class="ui-btn ui-btn--secundario" type="button" (click)="saveTrial()">Extender prueba</button></div>
        </section>

        <section class="bloque">
          <h3>Límites del plan</h3>
          <div class="ui-fila">
            <div class="ui-campo" [hidden]="isSchool()"><label for="cursos-admin">Cursos</label><input id="cursos-admin" class="ui-input" type="number" min="0" [value]="space.limits.courses" #courses /></div>
            <div class="ui-campo"><label for="estudiantes-admin">Estudiantes</label><input id="estudiantes-admin" class="ui-input" type="number" min="1" [value]="space.limits.students" #students /></div>
            <div class="ui-campo"><label for="almacen-admin">Almacenamiento (GB)</label><input id="almacen-admin" class="ui-input" type="number" min="1" [value]="space.limits.storageGb" #storage /></div>
          </div>
          <div class="botones">
            <button class="ui-btn ui-btn--secundario" type="button" (click)="saveLimits(+courses.value, +students.value, +storage.value)">Guardar límites</button>
          </div>
        </section>
      }
    </app-drawer>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminSpacesComponent {
  protected readonly admin = inject(AdminService);
  protected readonly statusLabel = spaceStatusLabel;
  protected readonly statusTone = spaceStatusTone;
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, { initialValue: { type: 'school' } });

  protected readonly faSchool = faSchool;
  protected readonly faChalkboardTeacher = faChalkboardTeacher;
  protected readonly faCircleCheck = faCircleCheck;
  protected readonly faHourglassHalf = faHourglassHalf;
  protected readonly faBan = faBan;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faPen = faPen;

  protected readonly tabs: { id: StatusFilter; label: string }[] = [
    { id: '', label: 'Todos' },
    { id: 'active', label: 'Activos' },
    { id: 'trial', label: 'En prueba' },
    { id: 'read_only', label: 'Solo lectura' },
    { id: 'suspended', label: 'Suspendidos' },
  ];

  protected readonly isSchool = computed(() => this.routeData()['type'] === 'school');
  protected readonly title = computed(() => (this.isSchool() ? 'Colegios' : 'Academias'));
  protected readonly description = computed(() =>
    this.isSchool()
      ? 'Colegios con espacio en Aulix. Desde aquí cambias su estado, su prueba y sus límites.'
      : 'Academias de docentes independientes. Desde aquí cambias su estado, su prueba y sus límites.',
  );
  protected readonly search = signal('');
  protected readonly statusFilter = signal<StatusFilter>('');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly newStatus = signal<AdminSpaceStatus>('active');
  protected readonly newTrialDate = signal('');
  protected readonly reason = signal('');

  private readonly ofType = computed(() => this.admin.spaces().filter((space) => space.type === this.routeData()['type']));
  protected readonly count = computed(() => {
    const spaces = this.ofType();
    return {
      all: spaces.length,
      active: spaces.filter((space) => space.status === 'active').length,
      trial: spaces.filter((space) => space.status === 'trial').length,
      blocked: spaces.filter((space) => space.status === 'suspended' || space.status === 'read_only').length,
    };
  });
  protected readonly visible = computed(() =>
    this.ofType()
      .filter((space) => !this.statusFilter() || space.status === this.statusFilter())
      .filter((space) => space.name.toLowerCase().includes(this.search().trim().toLowerCase())),
  );
  protected readonly details = computed(() => this.admin.spaces().find((space) => space.id === this.selectedId()) ?? null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('space'));
      const space = this.admin.spaces().find((item) => item.id === id && item.type === this.routeData()['type']);
      if (space) this.openDetails(space.id);
    });
  }

  countFor(status: StatusFilter): number {
    return status ? this.ofType().filter((space) => space.status === status).length : this.ofType().length;
  }

  openDetails(id: number): void {
    const space = this.admin.spaces().find((row) => row.id === id);
    if (!space) return;
    this.selectedId.set(id);
    this.newStatus.set(space.status === 'trial' ? 'active' : space.status);
    this.newTrialDate.set(space.trialEndsOn ?? '');
    this.reason.set('');
  }

  private validate(): boolean {
    if (this.reason().trim()) return true;
    this.notifications.error('Escribe el motivo del cambio.');
    return false;
  }
  saveStatus(): void {
    if (this.validate() && this.selectedId()) {
      this.admin.updateSpace(this.selectedId()!, { status: this.newStatus() }, this.reason());
      this.notifications.success('Estado actualizado.');
    }
  }
  saveTrial(): void {
    if (!this.validate() || !this.selectedId()) return;
    if (this.newTrialDate() <= new Date().toISOString().slice(0, 10)) {
      this.notifications.error('Elige una fecha posterior a hoy.');
      return;
    }
    this.admin.updateSpace(this.selectedId()!, { trialEndsOn: this.newTrialDate() }, this.reason());
    this.notifications.success('Prueba extendida.');
  }
  saveLimits(courses: number, students: number, storageGb: number): void {
    if (!this.validate() || !this.selectedId()) return;
    if (![courses, students, storageGb].every(Number.isInteger) || courses < 0 || students < 1 || storageGb < 1) {
      this.notifications.error('Los límites deben ser números enteros: estudiantes y almacenamiento desde 1.');
      return;
    }
    this.admin.updateSpace(this.selectedId()!, { limits: { courses, students, storageGb } }, this.reason());
    this.notifications.success('Límites actualizados.');
  }
}
