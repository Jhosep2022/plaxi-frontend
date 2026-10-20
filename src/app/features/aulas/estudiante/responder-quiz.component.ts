import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faArrowRight, faCheck, faCircleQuestion, faClock, faPaperPlane, faRotateRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { respuestaCorrecta, textoRespuesta } from '../../../core/models/quiz.model';
import type { Intento, Pregunta, Respuesta } from '../../../core/models/quiz.model';
import { fechaCorta } from '../../../core/utils/asistencia';
import { ahoraIso } from '../../../core/utils/tareas';
import { QuizService } from '../../../services/quiz.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

type Fase = 'inicio' | 'respondiendo' | 'resultado';
const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// El estudiante responde un quiz: una pregunta a la vez, con cronómetro, y ve su resultado al enviar
@Component({
  selector: 'app-responder-quiz',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  templateUrl: './responder-quiz.component.html',
  styleUrls: ['./responder-quiz.component.css'],
})
export class ResponderQuizComponent {
  private session = inject(SessionService);
  private servicio = inject(QuizService);
  private avisos = inject(AvisosService);

  readonly aulaId = input.required<string>();
  readonly quizId = input.required<string>();

  readonly letras = LETRAS;
  readonly fechaCorta = fechaCorta;
  readonly textoRespuesta = textoRespuesta;
  readonly respuestaCorrecta = respuestaCorrecta;
  readonly faArrowLeft = faArrowLeft;
  readonly faArrowRight = faArrowRight;
  readonly faCheck = faCheck;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faClock = faClock;
  readonly faPaperPlane = faPaperPlane;
  readonly faRotateRight = faRotateRight;
  readonly faXmark = faXmark;

  private readonly espacioId = this.session.espacioActivo()!.id;
  private readonly estudianteId = this.session.usuarioId()!;

  readonly datos = rxResource({
    params: () => ({ aulaId: Number(this.aulaId()), quizId: Number(this.quizId()) }),
    stream: ({ params }) =>
      forkJoin({ lista: this.servicio.quizzesEstudiante(params.aulaId, this.estudianteId), detalle: this.servicio.quizConPreguntas(params.quizId) }),
  });
  readonly quiz = computed(() => this.datos.value()?.lista.find((q) => q.id === Number(this.quizId())) ?? null);
  readonly puedeResponder = computed(() => {
    const q = this.quiz();
    return !!q && !q.cerrado && q.intentosHechos < q.intentos;
  });

  readonly fase = signal<Fase>('inicio');
  readonly preguntas = signal<Pregunta[]>([]);
  readonly indice = signal(0);
  readonly respuestas = signal<Map<number, Respuesta>>(new Map());
  readonly restante = signal(0); // segundos
  readonly enviando = signal(false);
  readonly intento = signal<Intento | null>(null);
  private inicio = '';
  private reloj: ReturnType<typeof setInterval> | undefined;

  readonly actual = computed(() => this.preguntas()[this.indice()] ?? null);
  readonly respondidas = computed(() => this.preguntas().filter((p) => this.respondida(p.id)).length);
  readonly relojTexto = computed(() => `${Math.floor(this.restante() / 60)}:${String(this.restante() % 60).padStart(2, '0')}`);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.reloj));
  }

  rutaAula() {
    return this.session.rutaRol('aulas', this.aulaId());
  }

  comenzar(): void {
    const q = this.quiz();
    const detalle = this.datos.value()?.detalle;
    if (!q || !detalle) return;
    const preguntas = [...detalle.preguntas];
    if (q.mezclar) preguntas.sort(() => Math.random() - 0.5);
    this.preguntas.set(preguntas);
    this.indice.set(0);
    this.respuestas.set(new Map());
    this.intento.set(null);
    this.inicio = ahoraIso();
    this.fase.set('respondiendo');
    clearInterval(this.reloj);
    if (q.tiempoMin) {
      this.restante.set(q.tiempoMin * 60);
      this.reloj = setInterval(() => {
        this.restante.update((s) => s - 1);
        if (this.restante() <= 0) {
          clearInterval(this.reloj);
          this.avisos.error('Se acabó el tiempo: enviamos tus respuestas.');
          this.enviar(true);
        }
      }, 1000);
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
      const intento = await firstValueFrom(this.servicio.enviar(this.espacioId, Number(this.quizId()), this.estudianteId, this.inicio,
        this.preguntas().map((p) => ({ preguntaId: p.id, valor: this.respuestas().get(p.id) ?? null }))));
      this.intento.set(intento);
      this.fase.set('resultado');
      this.datos.reload();
    } catch (e) {
      this.avisos.error(mensajeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  porcentaje(i: Intento): number {
    return Math.round((i.puntaje / Math.max(1, i.puntajeMax)) * 100);
  }

  correctas(i: Intento): number {
    return i.respuestas.filter((r) => r.correcta).length;
  }

  mensaje(i: Intento): string {
    const p = this.porcentaje(i);
    return p >= 80 ? '¡Excelente trabajo!' : p >= 51 ? '¡Bien hecho! Sigue así.' : 'Sigue practicando: repasa los temas y vuelve a intentarlo.';
  }

  preguntaDe(id: number): Pregunta | undefined {
    return this.preguntas().find((p) => p.id === id) ?? this.datos.value()?.detalle?.preguntas.find((p) => p.id === id);
  }
}
