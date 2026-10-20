import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faLink, faMagnifyingGlass, faUserCheck, faUsers, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { iniciales } from '../../../core/models/personas.model';
import { fechaCorta } from '../../../core/utils/asistencia';
import { AcademiaService, Solicitud } from '../../../services/academia.service';
import { AulasService } from '../../../services/aulas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../../direccion/academico/academico.ui';
import { InvitacionComponent } from './invitacion.component';

type Pestana = 'estudiantes' | 'solicitudes' | 'invitaciones';

// Docente de academia: estudiantes de todos sus cursos, solicitudes de inscripción y links de invitación
@Component({
  selector: 'app-estudiantes-academia',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent, InvitacionComponent],
  styles: `
    .barra { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .buscar { position: relative; }
    .buscar fa-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
    .buscar .ui-input { width: 260px; padding-left: 34px; }
    .persona { display: flex; align-items: center; gap: 10px; }
    .persona span:last-child { display: flex; flex-direction: column; }
    .persona small { font-size: 12px; color: var(--muted); }
    .avatar { width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; border-radius: 50%; background: var(--lime-soft); font-size: 12px; font-weight: bold; }
    .cursos { display: flex; gap: 6px; flex-wrap: wrap; }
    .cursos a { text-decoration: none; }
    .solicitudes { display: flex; flex-direction: column; gap: 10px; }
    .solicitud { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .solicitud .persona { flex: 1; min-width: 220px; }
    .chico { height: 34px; padding: 0 12px; font-size: 13px; }
    .invitaciones { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
    .invitaciones h3 { margin: 0 0 10px; font-size: 16px; }
    .invitaciones a { color: var(--dark-blue); text-decoration: none; }
    .vacio { padding: 18px; text-align: center; color: var(--muted); }
  `,
  template: `
    <app-page-header miga="Estudiantes" titulo="Estudiantes" descripcion="Quiénes están en tus cursos, quiénes esperan tu aprobación y los links para invitar a más.">
      <div class="ui-tabs" role="tablist">
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'estudiantes'" (click)="pestana.set('estudiantes')">Estudiantes <span class="contador">{{ estudiantes().length }}</span></button>
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'solicitudes'" (click)="pestana.set('solicitudes')">Solicitudes <span class="contador">{{ datos.value()?.solicitudes?.length ?? 0 }}</span></button>
        <button type="button" class="ui-tab" [class.activa]="pestana() === 'invitaciones'" (click)="pestana.set('invitaciones')">Links de invitación</button>
      </div>
    </app-page-header>

    @switch (pestana()) {
      @case ('estudiantes') {
        <section class="ui-card">
          <div class="barra">
            <label class="buscar">
              <fa-icon [icon]="faMagnifyingGlass" />
              <input class="ui-input" placeholder="Buscar estudiante" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" aria-label="Buscar estudiante" />
            </label>
            <span class="ui-ayuda">{{ visibles().length }} estudiantes en {{ cursos().length }} cursos</span>
          </div>
          <div class="ui-tabla-contenedor">
            <table class="ui-tabla" id="tabla-academia">
              <thead><tr><th>Estudiante</th><th>Cursos y avance</th></tr></thead>
              <tbody>
                @for (e of visibles(); track e.usuarioId) {
                  <tr>
                    <td><span class="persona"><span class="avatar">{{ iniciales(e.nombre) }}</span><span><strong>{{ e.nombre }}</strong><small>{{ e.gmail }}</small></span></span></td>
                    <td><div class="cursos">
                      @for (c of e.cursos; track c.aulaId) { <a class="ui-badge tono-azul" [routerLink]="session.rutaRol('clases', c.aulaId)" [queryParams]="{ tab: 'estudiantes' }">{{ c.nombre }} · {{ c.progreso }}%</a> }
                    </div></td>
                  </tr>
                } @empty {
                  <tr><td colspan="2" class="vacio">Todavía no hay estudiantes. Comparte el link de invitación de tus cursos.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
      @case ('solicitudes') {
        <div class="solicitudes">
          @for (s of datos.value()?.solicitudes ?? []; track s.idInscripcion) {
            <article class="ui-card solicitud">
              <span class="persona"><span class="avatar">{{ iniciales(s.nombre) }}</span><span><strong>{{ s.nombre }}</strong><small>Quiere unirse a <b>{{ s.curso }}</b> · {{ fechaCorta(s.fecha) }}</small></span></span>
              <button type="button" class="ui-btn chico" (click)="responder(s, true)"><fa-icon [icon]="faCheck" /> Aprobar</button>
              <button type="button" class="ui-btn ui-btn--secundario chico" (click)="responder(s, false)"><fa-icon [icon]="faXmark" /> Rechazar</button>
            </article>
          } @empty {
            <div class="ui-card"><app-empty-state [icono]="faUserCheck" titulo="No hay solicitudes pendientes" texto="Las solicitudes aparecen aquí en los cursos que piden aprobación." /></div>
          }
        </div>
      }
      @case ('invitaciones') {
        <div class="invitaciones">
          @for (c of cursos(); track c.id) {
            <section class="ui-card">
              <h3><a [routerLink]="session.rutaRol('clases', c.id)">{{ c.nombre }}</a></h3>
              <app-invitacion [aula]="c" (cambio)="datos.reload()" />
            </section>
          } @empty {
            <div class="ui-card"><app-empty-state [icono]="faLink" titulo="Todavía no creaste cursos" /></div>
          }
        </div>
      }
    }
  `,
})
export class EstudiantesAcademiaComponent {
  readonly session = inject(SessionService);
  private academia = inject(AcademiaService);
  private aulas = inject(AulasService);
  private avisos = inject(AvisosService);

  readonly tab = input<string>(); // data de la ruta: 'solicitudes' o 'invitaciones'

  readonly iniciales = iniciales;
  readonly fechaCorta = fechaCorta;
  readonly faCheck = faCheck;
  readonly faLink = faLink;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faUserCheck = faUserCheck;
  readonly faUsers = faUsers;
  readonly faXmark = faXmark;

  private readonly espacioId = this.session.espacioActivo()!.id;
  private readonly docenteId = this.session.usuarioId()!;

  readonly datos = rxResource({
    stream: () => forkJoin({
      estudiantes: this.academia.estudiantes(this.espacioId, this.docenteId),
      solicitudes: this.academia.solicitudes(this.espacioId, this.docenteId),
      aulas: this.aulas.aulasDocente(this.espacioId, this.docenteId),
    }),
  });
  readonly estudiantes = computed(() => this.datos.value()?.estudiantes ?? []);
  readonly cursos = computed(() => (this.datos.value()?.aulas ?? []).filter((a) => a.tipo === 'curso'));

  readonly pestana = linkedSignal<Pestana>(() => (this.tab() === 'solicitudes' || this.tab() === 'invitaciones' ? (this.tab() as Pestana) : 'estudiantes'));
  readonly busqueda = signal('');
  readonly visibles = computed(() => {
    const t = this.busqueda().trim().toLowerCase();
    return this.estudiantes().filter((e) => !t || e.nombre.toLowerCase().includes(t) || e.gmail.toLowerCase().includes(t));
  });

  async responder(s: Solicitud, aprobar: boolean): Promise<void> {
    try {
      await firstValueFrom(this.academia.responder(s.idInscripcion, aprobar));
      this.avisos.exito(aprobar ? `${s.nombre} ya está en "${s.curso}".` : 'Solicitud rechazada.');
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
