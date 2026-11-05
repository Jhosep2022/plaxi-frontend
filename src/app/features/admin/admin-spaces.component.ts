import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { NotificationService } from '../../shared/ui/notification.service';
import { AdminService, spaceStatusLabel, type AdminSpaceStatus } from './admin.service';

@Component({
  selector: 'app-admin-spaces', host: { class: 'ui-pagina' }, imports: [PageHeaderComponent],
  template: `
    <app-page-header miga="Plataforma / Espacios" [titulo]="title()" descripcion="Gestiona el estado, la prueba y los límites de cada espacio." />
    <section class="ui-card admin-section">
      <div class="admin-filters"><input class="ui-input" aria-label="Buscar espacios" placeholder="Buscar por nombre" [value]="search()" (input)="search.set($any($event.target).value)" />
        <select class="ui-input" aria-label="Filtrar por estado" [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value)">
          <option value="">Todos los estados</option><option value="trial">En prueba</option><option value="active">Activo</option><option value="read_only">Solo lectura</option><option value="suspended">Suspendido</option>
        </select></div>
      <div class="ui-tabla-contenedor"><table class="ui-tabla"><thead><tr><th>Espacio</th><th>Estado</th><th>Miembros</th><th>Prueba hasta</th><th></th></tr></thead><tbody>
        @for (space of visible(); track space.id) { <tr><td><strong>{{ space.name }}</strong><br /><small>{{ space.slug }}</small></td><td><span class="ui-badge tono-azul">{{ statusLabel(space.status) }}</span></td><td>{{ space.memberCount }}</td><td>{{ space.trialEndsOn || '—' }}</td><td><button class="ui-btn ui-btn--secundario" type="button" (click)="openDetails(space.id)">Ver detalle</button></td></tr> }
      </tbody></table></div>
      @if (!visible().length) { <p class="admin-empty">No hay espacios que coincidan con los filtros.</p> }
    </section>
    @if (details(); as space) {
      <section class="ui-card admin-section">
        <div class="admin-heading"><h2>{{ space.name }}</h2><button type="button" class="ui-btn ui-btn--secundario" (click)="selectedId.set(null)">Cerrar</button></div>
        <p>{{ space.type === 'school' ? 'Colegio' : 'Academia' }} · {{ space.memberCount }} miembros · Consumo no disponible · cuota {{ space.limits.storageGb }} GB</p>
        <div class="admin-forms">
          <div class="ui-campo"><label for="estado-admin">Estado</label><select id="estado-admin" class="ui-input" [value]="newStatus()" (change)="newStatus.set($any($event.target).value)"><option value="active">Activo</option><option value="read_only">Solo lectura</option><option value="suspended">Suspendido</option></select></div>
          <div class="ui-campo"><label for="prueba-admin">Prueba hasta</label><input id="prueba-admin" class="ui-input" type="date" [value]="newTrialDate() || space.trialEndsOn || ''" (change)="newTrialDate.set($any($event.target).value)" /></div>
          <div class="ui-campo"><label for="cursos-admin">Cursos</label><input id="cursos-admin" class="ui-input" type="number" min="0" [value]="space.limits.courses" #courses /></div>
          <div class="ui-campo"><label for="estudiantes-admin">Estudiantes</label><input id="estudiantes-admin" class="ui-input" type="number" min="1" [value]="space.limits.students" #students /></div>
          <div class="ui-campo"><label for="almacen-admin">Almacenamiento (GB)</label><input id="almacen-admin" class="ui-input" type="number" min="1" [value]="space.limits.storageGb" #storage /></div>
        </div>
        <div class="ui-campo"><label for="motivo-admin">Motivo del cambio</label><input id="motivo-admin" class="ui-input" [value]="reason()" (input)="reason.set($any($event.target).value)" placeholder="Obligatorio para registrar la acción" /></div>
        <div class="admin-actions"><button class="ui-btn" type="button" (click)="saveStatus()">Guardar estado</button><button class="ui-btn ui-btn--secundario" type="button" (click)="saveTrial()">Extender prueba</button><button class="ui-btn ui-btn--secundario" type="button" (click)="saveLimits(+courses.value, +students.value, +storage.value)">Guardar límites</button></div>
      </section>
    }
  `,
  styleUrl: './admin-pages.css',
})
export class AdminSpacesComponent {
  protected readonly admin = inject(AdminService);
  protected readonly statusLabel = spaceStatusLabel;
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data, { initialValue: { type: 'school' } });
  protected readonly title = computed(() => this.routeData()['type'] === 'school' ? 'Colegios' : 'Academias');
  protected readonly search = signal('');
  protected readonly statusFilter = signal('');
  protected readonly selectedId = signal<number | null>(null);
  protected readonly newStatus = signal<AdminSpaceStatus>('active');
  protected readonly newTrialDate = signal('');
  protected readonly reason = signal('');
  protected readonly visible = computed(() => this.admin.spaces().filter((space) => space.type === this.routeData()['type'])
    .filter((space) => !this.statusFilter() || space.status === this.statusFilter())
    .filter((space) => space.name.toLowerCase().includes(this.search().trim().toLowerCase())));
  protected readonly details = computed(() => this.admin.spaces().find((space) => space.id === this.selectedId()) ?? null);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('space'));
      const space = this.admin.spaces().find((item) => item.id === id && item.type === this.routeData()['type']);
      if (space) this.openDetails(space.id);
    });
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
  saveStatus(): void { if (this.validate() && this.selectedId()) { this.admin.updateSpace(this.selectedId()!, { status: this.newStatus() }, this.reason()); this.notifications.success('Estado actualizado.'); } }
  saveTrial(): void { if (this.validate() && this.selectedId() && this.newTrialDate() > new Date().toISOString().slice(0, 10)) { this.admin.updateSpace(this.selectedId()!, { trialEndsOn: this.newTrialDate() }, this.reason()); this.notifications.success('Prueba extendida.'); } }
  saveLimits(courses: number, students: number, storageGb: number): void {
    if (!this.validate() || !this.selectedId() || !Number.isInteger(courses) || !Number.isInteger(students) || !Number.isInteger(storageGb) || courses < 0 || students < 1 || storageGb < 1) return;
    this.admin.updateSpace(this.selectedId()!, { limits: { courses, students, storageGb } }, this.reason());
    this.notifications.success('Límites actualizados.');
  }
}
