import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRightToBracket, faChartPie, faDoorClosed, faUserClock, faUserMinus } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { NIVELES, Paralelo, TURNOS, compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { Estudiante } from '../../../core/models/asistencia.model';
import { edad, iniciales } from '../../../core/models/personas.model';
import { hoyIso } from '../../../core/utils/asistencia';
import { AcademicoService } from '../../../services/academico.service';
import { PersonasService } from '../../../services/personas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';

// Inscripciones de la gestión activa: cupos por paralelo, estudiantes sin curso, cambios de paralelo y retiros
@Component({
  selector: 'app-inscripciones',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./personas.css', './inscripciones.component.css'],
})
export class InscripcionesComponent {
  private personas = inject(PersonasService);
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly iniciales = iniciales;
  readonly paraleloLabel = paraleloLabel;
  readonly faArrowRightToBracket = faArrowRightToBracket;
  readonly faChartPie = faChartPie;
  readonly faDoorClosed = faDoorClosed;
  readonly faUserClock = faUserClock;
  readonly faUserMinus = faUserMinus;
  private readonly hoy = hoyIso();

  readonly gestion = rxResource({ stream: () => this.academico.gestionActiva(this.espacioId) });
  readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  readonly estudiantes = rxResource({ stream: () => this.personas.estudiantes(), defaultValue: [] });

  // Paralelos agrupados por nivel
  readonly grupos = computed(() => {
    const ordenados = [...this.paralelos.value()].sort(compararParalelos);
    return NIVELES.map((n) => ({ nivel: n.label, paralelos: ordenados.filter((p) => p.nivel === n.id) })).filter((g) => g.paralelos.length);
  });

  readonly seleccionadoId = linkedSignal<Paralelo[], number>({
    source: () => this.paralelos.value(),
    computation: (lista, previo) => (previo && lista.some((p) => p.id === previo.value) ? previo.value : [...lista].sort(compararParalelos)[0]?.id ?? 0),
  });
  readonly seleccionado = computed(() => this.paralelos.value().find((p) => p.id === this.seleccionadoId()) ?? null);

  readonly inscritos = computed(() => this.estudiantes.value().filter((e) => e.paraleloId === this.seleccionadoId()));
  readonly sinCurso = computed(() => this.estudiantes.value().filter((e) => !e.paraleloId));

  readonly resumen = computed(() => {
    const ps = this.paralelos.value();
    const inscritos = ps.reduce((s, p) => s + p.estudiantes, 0);
    const capacidad = ps.reduce((s, p) => s + p.capacidad, 0);
    return {
      inscritos,
      capacidad,
      ocupacion: capacidad ? Math.round((inscritos / capacidad) * 100) : 0,
      llenos: ps.filter((p) => p.estudiantes >= p.capacidad).length,
    };
  });

  readonly trabajando = signal(0); // id del estudiante que se está moviendo

  lleno(p: Paralelo): boolean {
    return p.estudiantes >= p.capacidad;
  }

  ocupacion(p: Paralelo): number {
    return p.capacidad ? Math.min(100, Math.round((p.estudiantes / p.capacidad) * 100)) : 0;
  }

  turnoLabel(p: Paralelo): string {
    return TURNOS.find((t) => t.id === p.turno)?.label ?? '';
  }

  edadDe(e: Estudiante): number {
    return edad(e.fechaNacimiento, this.hoy);
  }

  async inscribir(e: Estudiante): Promise<void> {
    const destino = this.seleccionado();
    if (!destino) return;
    await this.mover(e, destino.id, `${e.nombre} fue inscrito en ${paraleloLabel(destino)}.`);
  }

  async cambiar(e: Estudiante, select: HTMLSelectElement): Promise<void> {
    const destino = this.paralelos.value().find((p) => p.id === Number(select.value));
    select.value = '';
    if (!destino) return;
    if (!confirm(`¿Cambiar a ${e.nombre} de ${paraleloLabel(this.seleccionado()!)} a ${paraleloLabel(destino)}?\n\nSu asistencia y notas ya registradas quedan en el historial del paralelo anterior.`)) return;
    await this.mover(e, destino.id, `${e.nombre} ahora está en ${paraleloLabel(destino)}.`);
  }

  async retirar(e: Estudiante): Promise<void> {
    if (!confirm(`¿Retirar a ${e.nombre} de ${paraleloLabel(this.seleccionado()!)}? Quedará como "sin inscribir".`)) return;
    await this.mover(e, 0, `${e.nombre} fue retirado del curso.`);
  }

  private async mover(e: Estudiante, paraleloId: number, mensaje: string): Promise<void> {
    this.trabajando.set(e.id);
    try {
      await firstValueFrom(this.personas.inscribir(e.id, paraleloId));
      this.avisos.exito(mensaje);
      this.estudiantes.reload();
      this.paralelos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.trabajando.set(0);
    }
  }
}
