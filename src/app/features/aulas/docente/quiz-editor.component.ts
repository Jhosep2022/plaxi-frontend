import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowDown, faArrowLeft, faArrowUp, faCheck, faCircleQuestion, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { TIPOS_PREGUNTA } from '../../../core/models/quiz.model';
import type { TipoPregunta } from '../../../core/models/quiz.model';
import { hoyIso, sumarDias } from '../../../core/utils/asistencia';
import { AulasService } from '../../../services/aulas.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { BorradorPregunta, QuizService } from '../../../services/quiz.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

interface PreguntaEditable extends BorradorPregunta {
  clave: number; // identificador local para el @for
}

let siguienteClave = 1;
const nueva = (tipo: TipoPregunta): PreguntaEditable => ({
  clave: siguienteClave++, tipo, enunciado: '', puntos: 1, correcta: 0, aceptadas: tipo === 'corta' ? [''] : [],
  opciones: tipo === 'opcion' ? ['', '', ''] : [],
});

// Editor de quiz: preguntas (opción múltiple, V/F, respuesta corta) y configuración (tiempo, intentos, cierre, nota)
@Component({
  selector: 'app-quiz-editor',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  templateUrl: './quiz-editor.component.html',
  styleUrls: ['./quiz-editor.component.css'],
})
export class QuizEditorComponent {
  private session = inject(SessionService);
  private router = inject(Router);
  private servicio = inject(QuizService);
  private aulas = inject(AulasService);
  private calificaciones = inject(CalificacionesService);
  private avisos = inject(AvisosService);

  readonly asignacionId = input.required<string>();
  readonly quizId = input.required<string>(); // 'nuevo' o el id

  readonly tipos = TIPOS_PREGUNTA;
  readonly faArrowDown = faArrowDown;
  readonly faArrowLeft = faArrowLeft;
  readonly faArrowUp = faArrowUp;
  readonly faCheck = faCheck;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faXmark = faXmark;

  private readonly espacio = this.session.espacioActivo()!;
  readonly hoy = hoyIso();
  readonly esNuevo = computed(() => this.quizId() === 'nuevo');

  readonly datos = rxResource({
    params: () => ({ aulaId: Number(this.asignacionId()), quizId: this.quizId() }),
    stream: ({ params }) =>
      forkJoin({
        aula: this.aulas.aula(params.aulaId),
        existente: params.quizId === 'nuevo' ? of(null) : this.servicio.quizConPreguntas(Number(params.quizId)),
        config: this.calificaciones.config(this.espacio.id),
      }),
  });

  readonly config = signal({ titulo: '', descripcion: '', tiempoMin: 10, intentos: 1, cierre: sumarDias(hoyIso(), 7), horaCierre: '23:59', mezclar: false, mostrarRespuestas: true });
  readonly criterioId = signal('0');
  readonly preguntas = signal<PreguntaEditable[]>([nueva('opcion')]);
  readonly guardando = signal(false);
  readonly error = signal('');

  // Carga el quiz que se edita
  private readonly cargar = effect(() => {
    const q = this.datos.value()?.existente;
    if (!q) return;
    const { quiz } = q;
    this.config.set({ titulo: quiz.titulo, descripcion: quiz.descripcion, tiempoMin: quiz.tiempoMin, intentos: quiz.intentos, cierre: quiz.cierre, horaCierre: quiz.horaCierre, mezclar: quiz.mezclar, mostrarRespuestas: quiz.mostrarRespuestas });
    this.preguntas.set(q.preguntas.map((p) => ({ clave: siguienteClave++, tipo: p.tipo, enunciado: p.enunciado, opciones: [...p.opciones], correcta: p.correcta, aceptadas: p.aceptadas.length ? [...p.aceptadas] : [''], puntos: p.puntos })));
  });

  readonly yaCuenta = computed(() => !!this.datos.value()?.existente?.quiz.actividadId);
  readonly puntajeTotal = computed(() => this.preguntas().reduce((s, p) => s + (Number(p.puntos) || 0), 0));

  ruta(...segmentos: (string | number)[]) {
    return this.session.rutaRol('clases', this.asignacionId(), ...segmentos);
  }

  cambiarConfig(campo: keyof ReturnType<typeof this.config>, valor: string | number | boolean): void {
    this.config.update((c) => ({ ...c, [campo]: valor }));
  }

  // ---------- Preguntas ----------
  agregar(tipo: TipoPregunta): void {
    this.preguntas.update((ps) => [...ps, nueva(tipo)]);
  }

  quitar(i: number): void {
    this.preguntas.update((ps) => ps.filter((_, j) => j !== i));
  }

  mover(i: number, direccion: -1 | 1): void {
    this.preguntas.update((ps) => {
      const copia = [...ps];
      const j = i + direccion;
      if (j < 0 || j >= copia.length) return ps;
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  actualizar(i: number, cambio: Partial<PreguntaEditable>): void {
    this.preguntas.update((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
  }

  cambiarTipo(i: number, tipo: TipoPregunta): void {
    const p = this.preguntas()[i];
    this.actualizar(i, { ...nueva(tipo), clave: p.clave, enunciado: p.enunciado, puntos: p.puntos });
  }

  cambiarOpcion(i: number, k: number, texto: string): void {
    this.actualizar(i, { opciones: this.preguntas()[i].opciones.map((o, j) => (j === k ? texto : o)) });
  }

  agregarOpcion(i: number): void {
    this.actualizar(i, { opciones: [...this.preguntas()[i].opciones, ''] });
  }

  quitarOpcion(i: number, k: number): void {
    const p = this.preguntas()[i];
    this.actualizar(i, { opciones: p.opciones.filter((_, j) => j !== k), correcta: p.correcta === k ? 0 : p.correcta > k ? p.correcta - 1 : p.correcta });
  }

  cambiarAceptadas(i: number, texto: string): void {
    this.actualizar(i, { aceptadas: texto.split(',').map((t) => t.trim()) });
  }

  // ---------- Guardar ----------
  async guardar(publicar: boolean): Promise<void> {
    this.error.set('');
    const c = this.config();
    if (!c.titulo.trim()) return this.error.set('Ponle un título al quiz.');
    if (!c.cierre) return this.error.set('Indica la fecha de cierre.');
    this.guardando.set(true);
    try {
      const existente = this.datos.value()?.existente?.quiz;
      await firstValueFrom(this.servicio.guardar(
        this.espacio.id,
        this.session.usuarioId()!,
        { ...c, id: existente?.id, aulaId: Number(this.asignacionId()), tiempoMin: Number(c.tiempoMin) || 0, intentos: Math.max(1, Number(c.intentos) || 1), publicado: publicar || (existente?.publicado ?? false) },
        this.preguntas().map(({ clave: _clave, ...p }) => ({ ...p, puntos: Math.max(1, Number(p.puntos) || 1) })),
        Number(this.criterioId())
      ));
      this.avisos.exito(publicar ? 'Quiz publicado: tus estudiantes ya pueden responderlo.' : 'Quiz guardado.');
      this.router.navigate(this.ruta(), { queryParams: { tab: 'quiz' } });
    } catch (e) {
      this.error.set(mensajeError(e));
      this.avisos.error(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
