import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faChalkboard, faClock, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { DIAS_SEMANA, TURNOS, Turno, paraleloLabel } from '../../core/models/academico.model';
import { DatosHorario, clasesDeDocente, filasParaTurnos, itemsDeClases, turnosDeClases } from '../../core/utils/horario';
import { duracionLabel } from '../../core/utils/jornada';
import { AcademicoService } from '../../services/academico.service';
import { HorariosService } from '../../services/horarios.service';
import { ProfileService } from '../../services/profile.service';
import { HorarioSemanalComponent } from '../../shared/horario/horario-semanal.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

interface VistaMiHorario {
  datos: DatosHorario;
  titulo: string;
  descripcion: string;
  modo: 'docente' | 'paralelo';
  clases: DatosHorario['clases'];
  turnos: Turno[];
}

// "Mi horario" del docente (sus clases en todos los paralelos), del estudiante (su paralelo)
// y del padre (el paralelo de su hijo). Misma grilla, distintos datos.
@Component({
  selector: 'app-mi-horario',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, HorarioSemanalComponent],
  styles: `
    .resumen { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .cargando { color: var(--muted); }
  `,
  template: `
    @if (vista.isLoading() && !vista.value()) {
      <p class="cargando">Cargando horario…</p>
    } @else if (vista.value(); as v) {
      <app-page-header [miga]="miga()" [titulo]="v.titulo" [descripcion]="v.descripcion" />
      @if (v.clases.length) {
        <div class="resumen">
          <span class="ui-badge tono-lima"><fa-icon [icon]="faChalkboard" /> {{ v.clases.length }} clases por semana</span>
          <span class="ui-badge tono-azul"><fa-icon [icon]="faClock" /> {{ horasSemana() }} h semanales</span>
          <span class="ui-badge"><fa-icon [icon]="faHourglassHalf" /> Periodos de {{ duracion() }}</span>
        </div>
      }
      <div class="ui-card">
        <app-horario-semanal [dias]="dias()" [filas]="filas()" [items]="items()" vacio="Todavía no hay clases en tu horario." />
      </div>
    } @else {
      <div class="ui-card">
        <app-empty-state [icono]="faCalendarDays" titulo="Sin horario por ahora" [texto]="mensajeVacio()" />
      </div>
    }
  `,
})
export class MiHorarioComponent {
  private session = inject(SessionService);
  private horarios = inject(HorariosService);
  private academico = inject(AcademicoService);
  private perfiles = inject(ProfileService);

  readonly faCalendarDays = faCalendarDays;
  readonly faChalkboard = faChalkboard;
  readonly faClock = faClock;
  readonly faHourglassHalf = faHourglassHalf;

  private readonly espacio = this.session.espacioActivo()!;
  private readonly rol = this.session.rolActivo();
  private readonly usuarioId = this.session.usuarioId()!;

  readonly miga = computed(() => (this.rol === 'padre' ? 'Seguimiento' : 'Horario'));
  readonly mensajeVacio = computed(() =>
    this.espacio.tipo === 'academia'
      ? 'Tu academia todavía no publicó sesiones en vivo.'
      : 'Todavía no estás asignado a un paralelo con horario en la gestión activa.'
  );

  // Carga los datos del horario y elige qué clases mostrar según el rol
  readonly vista = rxResource<VistaMiHorario | null, unknown>({
    stream: () => {
      if (this.espacio.tipo !== 'colegio') return of(null);
      const datos$ = this.horarios.datos(this.espacio.id);

      if (this.rol === 'docente') {
        return datos$.pipe(map((datos) => ({
          datos, modo: 'docente' as const, clases: clasesDeDocente(datos, this.usuarioId),
          turnos: turnosDeClases(datos, clasesDeDocente(datos, this.usuarioId)),
          titulo: 'Mi horario', descripcion: 'Tus clases de la semana en todos tus paralelos.',
        })));
      }

      // Estudiante: su paralelo. Padre: el paralelo de su (primer) hijo.
      const estudianteId$ = this.rol === 'padre' ? this.academico.hijosDe(this.usuarioId).pipe(map((h) => h[0] ?? 0)) : of(this.usuarioId);
      return estudianteId$.pipe(
        switchMap((estudianteId) => forkJoin({
          datos: datos$,
          paraleloId: estudianteId ? this.academico.paraleloDeEstudiante(estudianteId) : of(0),
          hijo: this.rol === 'padre' && estudianteId ? this.perfiles.getProfile(estudianteId) : of(null),
        })),
        map(({ datos, paraleloId, hijo }) => {
          const paralelo = datos.paralelos.find((p) => p.id === paraleloId);
          if (!paralelo) return null;
          const turno = TURNOS.find((t) => t.id === paralelo.turno)?.label.toLowerCase();
          return {
            datos, modo: 'paralelo' as const, clases: datos.clases.filter((c) => c.paraleloId === paralelo.id),
            turnos: [paralelo.turno],
            titulo: hijo ? `Horario de ${hijo.nombre}` : 'Mi horario',
            descripcion: `${paraleloLabel(paralelo)} · turno ${turno}.`,
          };
        })
      );
    },
  });

  readonly dias = computed(() => DIAS_SEMANA.filter((d) => this.vista.value()?.datos.jornada.dias.includes(d.id)));

  readonly filas = computed(() => {
    const v = this.vista.value();
    if (!v) return [];
    return filasParaTurnos(v.datos.jornada, v.turnos.length ? v.turnos : ['manana']);
  });

  readonly items = computed(() => {
    const v = this.vista.value();
    return v ? itemsDeClases(v.datos, v.clases, v.modo) : [];
  });

  readonly duracion = computed(() => duracionLabel(this.vista.value()?.datos.jornada.duracionPeriodoMin ?? 0));
  readonly horasSemana = computed(() => {
    const v = this.vista.value();
    return v ? Math.round(((v.clases.length * v.datos.jornada.duracionPeriodoMin) / 60) * 10) / 10 : 0;
  });
}
