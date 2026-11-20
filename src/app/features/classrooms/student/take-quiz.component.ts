import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faArrowRight, faCheck, faCircleQuestion, faClock, faPaperPlane, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { textoRespuesta } from '../../../core/models/quiz.model';
import type { PreguntaParaResponder, Respuesta } from '../../../core/models/quiz.model';
import { formatShortDate } from '../../../core/utils/attendance';
import { IntentoCorregido, QuizService } from '../../../services/quiz.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { getErrorMessage } from '../../management/academics/academics.ui';

type Fase = 'inicio' | 'respondiendo' | 'resultado';
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// El estudiante responde un quiz: una pregunta a la vez, con cronómetro, y ve su resultado al enviar
@Component({
  selector: 'app-take-quiz',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  templateUrl: './take-quiz.component.html',
  styleUrls: ['./take-quiz.component.css'],
})
export class TakeQuizComponent {
  private session = inject(SessionService);
  private servicio = inject(QuizService);
  private avisos = inject(NotificationService);

  readonly aulaId = input.required<string>();
  readonly quizId = input.required<string>();

  readonly letras = LETRAS;
  readonly formatShortDate = formatShortDate;
  readonly textoRespuesta = textoRespuesta;
  readonly faArrowLeft = faArrowLeft;
  readonly faArrowRight = faArrowRight;
  readonly faCheck = faCheck;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faClock = faClock;
  readonly faPaperPlane = faPaperPlane;
  readonly faRotateRight = faRotateRight;
  readonly faXmark = faXmark;

  readonly datos = rxResource({
    params: () => Number(this.aulaId()),
    stream: ({ params }) => this.servicio.quizzesEstudiante(params),
  });
  readonly quiz = computed(() => this.datos.value()?.find((q) => q.id === Number(this.quizId())) ?? null);
  // Con un intento en curso se retoma; si no, hace falta que quede alguno (null = ilimitados)
  readonly puedeResponder = computed(() => {
    const q = this.quiz();
    return !!q && !q.cerrado && (!!q.enCurso || q.intentosRestantes === null || q.intentosRestantes > 0);
  });

  readonly fase = signal<Fase>('inicio');
  readonly preguntas = signal<PreguntaParaResponder[]>([]);
  readonly indice = signal(0);
  readonly respuestas = signal<Map<number, Respuesta>>(new Map());
  readonly restante = signal(0); // segundos
  readonly enviando = signal(false);
  readonly intento = signal<IntentoCorregido | null>(null);
  readonly comenzando = signal(false);
  private intentoId = 0;
  private reloj: ReturnType<typeof setInterval> | undefined;

  readonly actual = computed(() => this.preguntas()[this.indice()] ?? null);
  readonly respondidas = computed(() => this.preguntas().filter((p) => this.respondida(p.id)).length);
  readonly relojTexto = computed(() => `${Math.floor(this.restante() / 60)}:${String(this.restante() % 60).padStart(2, '0')}`);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.reloj));
  }

  rutaAula() {
    return this.session.roleRoute('aulas', this.aulaId());
  }

  // El servidor abre el intento (guarda la hora de inicio) y manda las preguntas, ya mezcladas si corresponde
  async comenzar(): Promise<void> {
    if (!this.quiz() || this.comenzando()) return;
    this.comenzando.set(true);
    try {
      const abierto = await firstValueFrom(this.servicio.iniciar(Number(this.quizId())));
      this.intentoId = abierto.intento.id;
      this.preguntas.set(abierto.preguntas);
      this.indice.set(0);
      this.respuestas.set(new Map());
      this.intento.set(null);
      this.fase.set('respondiendo');
      clearInterval(this.reloj);
      if (abierto.intento.expira) {
        const expira = Date.parse(abierto.intento.expira);
        this.restante.set(Math.max(0, Math.round((expira - Date.now()) / 1000)));
        this.reloj = setInterval(() => {
          this.restante.set(Math.max(0, Math.round((expira - Date.now()) / 1000)));
          if (this.restante() <= 0) {
            clearInterval(this.reloj);
            this.avisos.error('Se acabó el tiempo: enviamos tus respuestas.');
            this.enviar(true);
          }
        }, 1000);
      }
    } catch (e) {
      this.avisos.error(getErrorMessage(e));
    } finally {
      this.comenzando.set(false);
    }
  }

  responder(valor: Respuesta): void {
    const p = this.actual();
    if (p) this.respuestas.update((m) => new Map(m).set(p.id, valor));
  }

  respondida(preguntaId: number): boolean {
    const v = this.respuestas().get(preguntaId);
    return v !== undefined && v !== null && v !== '';
  }

  ir(i: number): void {
    if (i >= 0 && i < this.preguntas().length) this.indice.set(i);
  }

  async enviar(automatico = false): Promise<void> {
    const faltan = this.preguntas().length - this.respondidas();
    if (!automatico && faltan && !confirm(`Te ${faltan === 1 ? 'falta 1 pregunta' : `faltan ${faltan} preguntas`} por responder. ¿Enviar de todas formas?`)) return;
    clearInterval(this.reloj);
    this.enviando.set(true);
    try {
      const intento = await firstValueFrom(
        this.servicio.enviar(this.intentoId, this.preguntas().map((p) => ({ preguntaId: p.id, valor: this.respuestas().get(p.id) ?? null }))),
      );
      if (intento.fueraDeTiempo) this.avisos.error('Tus respuestas llegaron fuera de tiempo: el intento se cerró sin contarlas.');
      if (intento.nota && !intento.nota.guardada) this.avisos.error('El periodo ya está cerrado: tu puntaje no cambió la nota de la planilla.');
      this.intento.set(intento);
      this.fase.set('resultado');
      this.datos.reload();
    } catch (e) {
      this.avisos.error(getErrorMessage(e));
    } finally {
      this.enviando.set(false);
    }
  }

  porcentaje(i: { puntaje: number; puntajeMax: number }): number {
    return Math.round((i.puntaje / Math.max(1, i.puntajeMax)) * 100);
  }

  correctas(i: IntentoCorregido): number {
    return i.respuestas.filter((r) => r.correcta).length;
  }

  mensaje(i: IntentoCorregido): string {
    const p = this.porcentaje(i);
    return p >= 80 ? '¡Excelente trabajo!' : p >= 51 ? '¡Bien hecho! Sigue así.' : 'Sigue practicando: repasa los temas y vuelve a intentarlo.';
  }

  preguntaDe(id: number): PreguntaParaResponder | undefined {
    return this.preguntas().find((p) => p.id === id);
  }

  // La respuesta correcta solo llega cuando ya no quedan intentos (o el quiz cerró)
  correctaDe(i: IntentoCorregido, preguntaId: number): string | null {
    return i.correctas?.find((c) => c.preguntaId === preguntaId)?.respuesta ?? null;
  }
}
