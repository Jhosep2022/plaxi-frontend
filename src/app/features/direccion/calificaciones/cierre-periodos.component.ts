import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { Gestion } from '../../../core/models/academico.model';
import { fechaCorta, hoyIso } from '../../../core/utils/asistencia';
import { AcademicoService } from '../../../services/academico.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';

type EstadoPeriodo = 'cerrado' | 'en-curso' | 'terminado' | 'proximo';

// Cierre de periodos: al cerrar, las notas quedan bloqueadas para los docentes
@Component({
  selector: 'app-cierre-periodos',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent],
  styles: `
    .cargando { color: var(--muted); }
    .periodos { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .periodo { display: flex; flex-direction: column; gap: 14px; }
    .periodo.actual { border-color: var(--lime-green); box-shadow: 0 0 0 2px var(--lime-soft); }
    .cabecera { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    h2 { margin: 0; font-size: 17px; }
    .fechas { font-size: 13px; color: var(--muted); }
    .avance { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .linea { display: flex; justify-content: space-between; }
    .detalle { margin: 0; padding: 0; list-style: none; font-size: 13px; color: var(--muted); display: flex; flex-direction: column; gap: 4px; }
    .alerta { color: var(--cream-strong); font-weight: bold; }
    .acciones { display: flex; justify-content: flex-end; margin-top: auto; padding-top: 12px; border-top: 1px solid var(--line); }
    .estado-proximo { background: var(--page-bg); color: var(--muted); }
  `,
  template: `
    <app-page-header miga="Calificaciones" titulo="Cierre de periodos"
      descripcion="Cuando un periodo termina y los docentes cargaron sus notas, ciérralo: las notas quedan bloqueadas y pasan al boletín como definitivas. Puedes reabrirlo si hace falta corregir algo." />

    @if (datos.isLoading() && !datos.value()) {
      <p class="cargando">Cargando periodos…</p>
    } @else if (datos.value(); as d) {
      <div class="periodos">
        @for (p of d.gestion.periodos; track $index; let i = $index) {
          @let pr = d.progreso[i];
          @let estado = estadoDe(d.gestion, i);
          <article class="ui-card periodo" [class.actual]="estado === 'en-curso'">
            <div class="cabecera">
              <div>
                <h2>{{ p.nombre }}</h2>
                <span class="fechas"><fa-icon [icon]="faCalendarDays" /> {{ fechaCorta(p.inicio) }} – {{ fechaCorta(p.fin) }}</span>
              </div>
              @switch (estado) {
                @case ('cerrado') { <span class="ui-badge tono-azul"><fa-icon [icon]="faLock" /> Cerrado</span> }
                @case ('en-curso') { <span class="ui-badge tono-lima">En curso</span> }
                @case ('terminado') { <span class="ui-badge tono-crema">Terminado · sin cerrar</span> }
                @default { <span class="ui-badge estado-proximo">Próximo</span> }
              }
            </div>

            @if (estado !== 'proximo') {
              <div class="avance">
                <div class="linea"><span>Notas cargadas</span><strong>{{ porcentaje(pr.notasCargadas, pr.notasEsperadas) }}%</strong></div>
                <div class="ui-barra" [class]="porcentaje(pr.notasCargadas, pr.notasEsperadas) === 100 ? 'tono-lima' : 'tono-crema'">
                  <span [style.width.%]="porcentaje(pr.notasCargadas, pr.notasEsperadas)"></span>
                </div>
              </div>
              <ul class="detalle">
                <li>{{ pr.actividades }} actividades evaluadas</li>
                <li>{{ pr.notasCargadas }} de {{ pr.notasEsperadas }} notas registradas</li>
                @if (pr.materiasSinActividades) {
                  <li class="alerta">{{ pr.materiasSinActividades }} {{ pr.materiasSinActividades === 1 ? 'materia' : 'materias' }} sin actividades</li>
                }
                @if (cierreDe(i); as c) {
                  <li>Cerrado el {{ fechaCorta(c.cerradoEl) }}</li>
                }
              </ul>
            }

            <div class="acciones">
              @if (cierreDe(i)) {
                <button type="button" class="ui-btn ui-btn--secundario" (click)="reabrir(i)"><fa-icon [icon]="faLockOpen" /> Reabrir</button>
              } @else if (estado !== 'proximo') {
                <button type="button" class="ui-btn" (click)="cerrar(d.gestion, i)"><fa-icon [icon]="faLock" /> Cerrar periodo</button>
              } @else {
                <span class="fechas">Empieza el {{ fechaCorta(p.inicio) }}</span>
              }
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="ui-card"><app-empty-state [icono]="faCalendarDays" titulo="No hay una gestión activa" texto="Activa una gestión en Académico → Gestión y periodos." /></div>
    }
  `,
})
export class CierrePeriodosComponent {
  private academico = inject(AcademicoService);
  private calificaciones = inject(CalificacionesService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly faCalendarDays = faCalendarDays;
  readonly faLock = faLock;
  readonly faLockOpen = faLockOpen;
  readonly fechaCorta = fechaCorta;
  private readonly hoy = hoyIso();

  readonly datos = rxResource({
    stream: () =>
      this.academico.gestionActiva(this.espacioId).pipe(
        switchMap((gestion) =>
          gestion
            ? forkJoin({ gestion: of(gestion), cierres: this.calificaciones.cierres(this.espacioId, gestion.id), progreso: this.calificaciones.progreso(this.espacioId, gestion) })
            : of(null)
        )
      ),
  });

  private readonly cierres = computed(() => this.datos.value()?.cierres ?? []);

  cierreDe(periodo: number) {
    return this.cierres().find((c) => c.periodo === periodo);
  }

  estadoDe(gestion: Gestion, i: number): EstadoPeriodo {
    const p = gestion.periodos[i];
    if (this.cierreDe(i)) return 'cerrado';
    if (p.inicio > this.hoy) return 'proximo';
    return p.fin < this.hoy ? 'terminado' : 'en-curso';
  }

  porcentaje(cargadas: number, esperadas: number): number {
    return esperadas ? Math.round((cargadas / esperadas) * 100) : 0;
  }

  async cerrar(gestion: Gestion, periodo: number): Promise<void> {
    const pr = this.datos.value()!.progreso[periodo];
    const faltan = pr.notasEsperadas - pr.notasCargadas;
    const p = gestion.periodos[periodo];
    const avisos = [
      p.fin >= this.hoy ? `El periodo termina el ${fechaCorta(p.fin)}.` : '',
      faltan > 0 ? `Faltan ${faltan} notas por registrar.` : '',
      pr.materiasSinActividades ? `${pr.materiasSinActividades} materias no tienen actividades.` : '',
    ].filter(Boolean);
    if (!confirm(`¿Cerrar el ${p.nombre}? Los docentes ya no podrán modificar sus notas.${avisos.length ? '\n\n' + avisos.join('\n') : ''}`)) return;
    try {
      await firstValueFrom(this.calificaciones.cerrarPeriodo(this.espacioId, gestion, periodo));
      this.avisos.exito(`${p.nombre} cerrado. Sus notas ya son definitivas.`);
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  async reabrir(periodo: number): Promise<void> {
    const cierre = this.cierreDe(periodo);
    const nombre = this.datos.value()!.gestion.periodos[periodo].nombre;
    if (!cierre || !confirm(`¿Reabrir el ${nombre}? Los docentes podrán volver a modificar sus notas.`)) return;
    try {
      await firstValueFrom(this.calificaciones.reabrirPeriodo(cierre));
      this.avisos.exito(`${nombre} reabierto.`);
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
