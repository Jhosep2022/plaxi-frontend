import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faArrowRight, faBookOpen, faCheck, faCircleCheck, faCircleQuestion, faClock, faDownload, faLink, faListCheck, faLock, faPlay, faStar,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { ESTADO_ENTREGA } from '../../../core/models/assignments.model';
import type { Tema } from '../../../core/models/classrooms.model';
import { todayIso } from '../../../core/utils/attendance';
import { calcularNota, indiceNotas, periodoDeFecha } from '../../../core/utils/grades';
import { formatDueDate } from '../../../core/utils/assignments';
import { ClassroomsService, UnidadConTemas } from '../../../services/classrooms.service';
import { GradesService } from '../../../services/grades.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { EstadoQuiz, QuizService } from '../../../services/quiz.service';
import { formatShortDate } from '../../../core/utils/attendance';
import { ProgressRingComponent } from '../../../shared/classrooms/progress-ring.component';
import { ClassroomCoverComponent } from '../../../shared/classrooms/classroom-cover.component';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ICONO_TEMA } from '../teacher/teacher-content.component';

type Pestana = 'contenido' | 'quiz' | 'tareas' | 'notas';

interface UnidadVista extends UnidadConTemas {
  bloqueada: boolean;
  vistos: number;
}

// Aula virtual del estudiante: contenido con su avance (y unidades bloqueadas), tareas y notas de la materia
@Component({
  selector: 'app-student-classroom',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent, ClassroomCoverComponent, ProgressRingComponent],
  templateUrl: './student-classroom.component.html',
  styleUrls: ['./student-classroom.component.css'],
})
export class StudentClassroomComponent {
  private session = inject(SessionService);
  private aulas = inject(ClassroomsService);
  private tareasService = inject(AssignmentsService);
  private calificaciones = inject(GradesService);
  private avisos = inject(NotificationService);
  private quizService = inject(QuizService);

  readonly aulaId = input.required<string>();

  readonly iconoTema = ICONO_TEMA;
  readonly estados = ESTADO_ENTREGA;
  readonly formatDueDate = formatDueDate;
  readonly faArrowLeft = faArrowLeft;
  readonly faArrowRight = faArrowRight;
  readonly faBookOpen = faBookOpen;
  readonly faCheck = faCheck;
  readonly faCircleCheck = faCircleCheck;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faClock = faClock;
  readonly faDownload = faDownload;
  readonly faLink = faLink;
  readonly faListCheck = faListCheck;
  readonly faLock = faLock;
  readonly faPlay = faPlay;
  readonly faStar = faStar;

  private readonly espacio = this.session.activeSpace()!;
  private readonly estudianteId = this.session.userId()!;
  private readonly id = computed(() => Number(this.aulaId()));

  // El aula (solo si el estudiante pertenece a ella), su contenido publicado y su avance
  readonly datos = rxResource({
    params: () => this.id(),
    stream: ({ params }) =>
      forkJoin({
        aulas: this.aulas.aulasEstudiante(this.espacio.id, this.estudianteId),
        contenido: this.aulas.contenido(params, true),
        vistos: this.aulas.progresoDe(params, this.estudianteId),
        tareas: this.tareasService.tareasDeEstudiante(this.espacio.id, this.estudianteId),
      }),
  });
  readonly aula = computed(() => this.datos.value()?.aulas.find((a) => a.id === this.id()) ?? null);

  // Temas vistos (copia local para marcar sin recargar)
  readonly vistos = linkedSignal(() => new Set(this.datos.value()?.vistos ?? []));

  // Unidades con su avance; una unidad se bloquea si lo pide el docente y la anterior no está completa
  readonly unidades = computed<UnidadVista[]>(() => {
    const vistos = this.vistos();
    const lista = this.datos.value()?.contenido ?? [];
    return lista.map((u, i) => {
      const anterior = lista[i - 1];
      const anteriorCompleta = !anterior || anterior.temas.every((t) => vistos.has(t.id));
      return { ...u, vistos: u.temas.filter((t) => vistos.has(t.id)).length, bloqueada: i > 0 && u.requiereAnterior && !anteriorCompleta };
    });
  });
  private readonly temasAbiertos = computed(() => this.unidades().filter((u) => !u.bloqueada).flatMap((u) => u.temas));
  readonly totalTemas = computed(() => this.unidades().reduce((s, u) => s + u.temas.length, 0));
  readonly progreso = computed(() => (this.totalTemas() ? Math.round((this.vistos().size / this.totalTemas()) * 100) : 0));
  readonly siguiente = computed(() => this.temasAbiertos().find((t) => !this.vistos().has(t.id)) ?? null);

  // Tema abierto: al cargar el aula, el siguiente pendiente; después solo cambia cuando el estudiante elige otro
  readonly temaId = linkedSignal<unknown, number>({
    source: () => this.datos.value(),
    computation: () => untracked(() => this.siguiente()?.id ?? this.temasAbiertos()[0]?.id ?? 0),
  });
  readonly tema = computed(() => this.temasAbiertos().find((t) => t.id === this.temaId()) ?? null);
  readonly unidadDelTema = computed(() => this.unidades().find((u) => u.temas.some((t) => t.id === this.temaId())) ?? null);

  readonly pestana = signal<Pestana>('contenido');

  // ---------- Quiz ----------
  readonly fechaCortaQuiz = formatShortDate;
  readonly estadoQuiz: Record<EstadoQuiz, { label: string; tono: string }> = {
    pendiente: { label: 'Pendiente', tono: 'tono-crema' },
    realizado: { label: 'Realizado', tono: 'tono-lima' },
    agotado: { label: 'Realizado', tono: 'tono-lima' },
    cerrado: { label: 'Cerrado', tono: '' },
  };
  readonly quizzes = rxResource({ params: () => this.id(), stream: ({ params }) => this.quizService.quizzesEstudiante(params, this.estudianteId), defaultValue: [] });
  readonly quizPendientes = computed(() => this.quizzes.value().filter((q) => q.estado === 'pendiente').length);

  readonly tareas = computed(() => {
    const a = this.aula();
    return (this.datos.value()?.tareas ?? []).filter((t) => t.tarea.aulaId === a?.id);
  });

  // Nota de la materia en el periodo, por criterio (solo colegio)
  readonly notas = rxResource({
    params: () => this.aula(),
    stream: ({ params }) => (params?.tipo === 'clase' ? this.calificaciones.getClassGroupData(this.espacio.id, params.paraleloId) : of(null)),
  });
  readonly resultado = computed(() => {
    const d = this.notas.value();
    const a = this.aula();
    if (!d || !a) return null;
    const indice = periodoDeFecha(d.gestion, todayIso());
    const actividades = d.actividades.filter((x) => x.materiaId === a.materiaId && x.periodo === indice);
    return { periodo: d.gestion.periodos[indice]?.nombre ?? '', config: d.config, ...calcularNota(d.config.criterios, actividades, indiceNotas(d.notas), this.estudianteId) };
  });

  espacioEsColegio(): boolean {
    return this.espacio.tipo === 'colegio';
  }

  ruta(...segmentos: (string | number)[]) {
    return this.session.roleRoute(...segmentos);
  }

  abrir(t: Tema, bloqueada: boolean): void {
    if (bloqueada) {
      this.avisos.error('Completa la unidad anterior para abrir esta.');
      return;
    }
    this.temaId.set(t.id);
  }

  readonly marcando = signal(false);

  async marcarVisto(t: Tema): Promise<void> {
    this.marcando.set(true);
    try {
      await firstValueFrom(this.aulas.marcarVisto(t.id, this.estudianteId));
      const antes = this.unidades().filter((u) => u.bloqueada).length;
      this.vistos.update((v) => new Set(v).add(t.id));
      if (this.unidades().filter((u) => u.bloqueada).length < antes) this.avisos.success('¡Completaste la unidad! Se desbloqueó la siguiente.');
    } finally {
      this.marcando.set(false);
    }
  }

  irAlSiguiente(): void {
    const temas = this.temasAbiertos();
    const i = temas.findIndex((t) => t.id === this.temaId());
    const sig = temas[i + 1];
    if (sig) this.temaId.set(sig.id);
  }

  hayOtro(): boolean {
    const temas = this.temasAbiertos();
    return temas.findIndex((t) => t.id === this.temaId()) < temas.length - 1;
  }

  esVideoDirecto(url: string): boolean {
    return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
  }

  porcentajeNota(nota: number): number {
    return Math.round((nota / (this.resultado()?.config.notaMaxima ?? 100)) * 100);
  }
}
