import { Component, computed, inject, input, linkedSignal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faArrowRight, faBookOpen, faCheck, faCircleCheck, faCircleQuestion, faClock, faDownload, faLink, faListCheck, faLock, faPlay, faStar,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { ESTADO_ENTREGA } from '../../../core/models/tareas.model';
import type { Tema } from '../../../core/models/aulas.model';
import { hoyIso } from '../../../core/utils/asistencia';
import { calcularNota, indiceNotas, periodoDeFecha } from '../../../core/utils/calificaciones';
import { venceLabel } from '../../../core/utils/tareas';
import { AulasService, UnidadConTemas } from '../../../services/aulas.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { TareasService } from '../../../services/tareas.service';
import { EstadoQuiz, QuizService } from '../../../services/quiz.service';
import { fechaCorta } from '../../../core/utils/asistencia';
import { AnilloComponent } from '../../../shared/aulas/anillo.component';
import { PortadaAulaComponent } from '../../../shared/aulas/portada-aula.component';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { ICONO_TEMA } from '../docente/contenido-docente.component';

type Pestana = 'contenido' | 'quiz' | 'tareas' | 'notas';

interface UnidadVista extends UnidadConTemas {
  bloqueada: boolean;
  vistos: number;
}

// Aula virtual del estudiante: contenido con su avance (y unidades bloqueadas), tareas y notas de la materia
@Component({
  selector: 'app-aula-estudiante',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent, PortadaAulaComponent, AnilloComponent],
  templateUrl: './aula-estudiante.component.html',
  styleUrls: ['./aula-estudiante.component.css'],
})
export class AulaEstudianteComponent {
  private session = inject(SessionService);
  private aulas = inject(AulasService);
  private tareasService = inject(TareasService);
  private calificaciones = inject(CalificacionesService);
  private avisos = inject(AvisosService);
  private quizService = inject(QuizService);

  readonly aulaId = input.required<string>();

  readonly iconoTema = ICONO_TEMA;
  readonly estados = ESTADO_ENTREGA;
  readonly venceLabel = venceLabel;
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

  private readonly espacio = this.session.espacioActivo()!;
  private readonly estudianteId = this.session.usuarioId()!;
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
  readonly fechaCortaQuiz = fechaCorta;
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
    stream: ({ params }) => (params?.tipo === 'clase' ? this.calificaciones.datosDeParalelo(this.espacio.id, params.paraleloId) : of(null)),
  });
  readonly resultado = computed(() => {
    const d = this.notas.value();
    const a = this.aula();
    if (!d || !a) return null;
    const indice = periodoDeFecha(d.gestion, hoyIso());
    const actividades = d.actividades.filter((x) => x.materiaId === a.materiaId && x.periodo === indice);
    return { periodo: d.gestion.periodos[indice]?.nombre ?? '', config: d.config, ...calcularNota(d.config.criterios, actividades, indiceNotas(d.notas), this.estudianteId) };
  });

  espacioEsColegio(): boolean {
    return this.espacio.tipo === 'colegio';
  }

  ruta(...segmentos: (string | number)[]) {
    return this.session.rutaRol(...segmentos);
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
      if (this.unidades().filter((u) => u.bloqueada).length < antes) this.avisos.exito('¡Completaste la unidad! Se desbloqueó la siguiente.');
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
