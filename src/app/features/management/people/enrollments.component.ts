import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightToBracket,
  faChartPie,
  faDoorClosed,
  faUserClock,
  faUserMinus,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import {
  NIVELES,
  Paralelo,
  TURNOS,
  compararParalelos,
  paraleloLabel,
} from '../../../core/models/academics.model';
import { Estudiante, MOTIVOS_RETIRO, MotivoRetiro } from '../../../core/models/attendance.model';
import { formatDateWithYear } from '../../../core/utils/attendance';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { edad, iniciales } from '../../../core/models/people.model';
import { todayIso } from '../../../core/utils/attendance';

import { PeopleService } from '../../../services/people.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { getErrorMessage } from '../academics/academics.ui';
import { SELECT } from '../../../shared/ui/select.component';

// Inscripciones de la gestión activa: cupos por paralelo, estudiantes sin curso, cambios de paralelo y retiros
@Component({
  selector: 'app-enrollments',
  host: { class: 'ui-pagina' },
  imports: [
    ...SELECT,
    FaIconComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    DrawerComponent,
  ],
  templateUrl: './enrollments.component.html',
  styleUrls: ['./people.css', './enrollments.component.css'],
})
export class EnrollmentsComponent {
  private personas = inject(PeopleService);

  private avisos = inject(NotificationService);
  private readonly espacioId = inject(SessionService).activeSpace()!.id;

  readonly iniciales = iniciales;
  readonly paraleloLabel = paraleloLabel;
  readonly faArrowRightToBracket = faArrowRightToBracket;
  readonly faChartPie = faChartPie;
  readonly faDoorClosed = faDoorClosed;
  readonly faUserClock = faUserClock;
  readonly faUserMinus = faUserMinus;
  private readonly hoy = todayIso();

  readonly gestion = rxResource({ stream: () => this.personas.activeYear() });
  readonly paralelos = rxResource({
    stream: () => this.personas.classGroups(),
    defaultValue: [],
  });
  readonly estudiantes = rxResource({
    stream: () => this.personas.estudiantes(),
    defaultValue: [],
  });

  // Paralelos agrupados por nivel
  readonly grupos = computed(() => {
    const ordenados = [...this.paralelos.value()].sort(compararParalelos);
    return NIVELES.map((n) => ({
      nivel: n.label,
      paralelos: ordenados.filter((p) => p.nivel === n.id),
    })).filter((g) => g.paralelos.length);
  });

  readonly seleccionadoId = linkedSignal<Paralelo[], number>({
    source: () => this.paralelos.value(),
    computation: (lista, previo) =>
      previo && lista.some((p) => p.id === previo.value)
        ? previo.value
        : ([...lista].sort(compararParalelos)[0]?.id ?? 0),
  });
  readonly seleccionado = computed(
    () =>
      this.paralelos.value().find((p) => p.id === this.seleccionadoId()) ??
      null,
  );

  readonly inscritos = computed(() =>
    this.estudiantes
      .value()
      .filter((e) => e.paraleloId === this.seleccionadoId()),
  );
  readonly sinCurso = computed(() =>
    this.estudiantes.value().filter((e) => !e.paraleloId && !e.retiro),
  );
  // Retirados en esta gestión: pueden volver a inscribirse
  readonly retirados = computed(() =>
    this.estudiantes.value().filter((e) => !e.paraleloId && e.retiro),
  );

  readonly motivos = MOTIVOS_RETIRO;
  readonly porRetirar = signal<Estudiante | null>(null);
  readonly motivo = signal<MotivoRetiro | null>(null);

  motivoLabel(id: MotivoRetiro): string {
    return MOTIVOS_RETIRO.find((m) => m.id === id)?.label ?? id;
  }

  fechaLarga(fecha: string): string {
    return formatDateWithYear(fecha);
  }

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
    return p.capacidad
      ? Math.min(100, Math.round((p.estudiantes / p.capacidad) * 100))
      : 0;
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
    await this.mover(
      e,
      destino.id,
      `${e.nombre} fue inscrito en ${paraleloLabel(destino)}.`,
    );
  }

  async cambiar(e: Estudiante, paraleloId: string): Promise<void> {
    const destino = this.paralelos
      .value()
      .find((p) => p.id === Number(paraleloId));
    if (!destino) return;
    if (
      !confirm(
        `¿Cambiar a ${e.nombre} de ${paraleloLabel(this.seleccionado()!)} a ${paraleloLabel(destino)}?\n\nSu asistencia y notas ya registradas quedan en el historial del paralelo anterior.`,
      )
    )
      return;
    await this.mover(
      e,
      destino.id,
      `${e.nombre} ahora está en ${paraleloLabel(destino)}.`,
    );
  }

  retirar(e: Estudiante): void {
    this.motivo.set(null);
    this.porRetirar.set(e);
  }

  async confirmarRetiro(): Promise<void> {
    const e = this.porRetirar();
    const motivo = this.motivo();
    if (!e || !motivo) return;
    this.trabajando.set(e.id);
    try {
      await firstValueFrom(this.personas.retirar(e.id, motivo));
      this.avisos.success(`${e.nombre} quedó como retirado. Sus notas y asistencia se conservan.`);
      this.porRetirar.set(null);
      this.estudiantes.reload();
      this.paralelos.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.trabajando.set(0);
    }
  }

  private async mover(
    e: Estudiante,
    paraleloId: number,
    mensaje: string,
  ): Promise<void> {
    this.trabajando.set(e.id);
    try {
      await firstValueFrom(this.personas.inscribir(e.id, paraleloId));
      this.avisos.success(mensaje);
      this.estudiantes.reload();
      this.paralelos.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.trabajando.set(0);
    }
  }
}
