import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCircleQuestion, faFileCsv, faPen, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { TIPOS_PREGUNTA, respuestaCorrecta } from '../../../core/models/quiz.model';
import { iniciales } from '../../../core/models/personas.model';
import { fechaCorta } from '../../../core/utils/asistencia';
import { descargarCsv, porcentaje } from '../../../core/utils/reportes';
import { QuizService } from '../../../services/quiz.service';
import { AnilloComponent } from '../../../shared/aulas/anillo.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';

// Resultados de un quiz: precisión, completado, acierto por pregunta y puntaje de cada estudiante
@Component({
  selector: 'app-quiz-resultados',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, AnilloComponent, EmptyStateComponent],
  styles: `
    .cargando { color: var(--muted); }
    .volver { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 13px; color: var(--muted); text-decoration: none; }
    .cabecera { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
    .cabecera .titulos { flex: 1; min-width: 240px; }
    h1 { margin: 0; font-size: 24px; }
    .cabecera p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
    .anillos { display: flex; gap: 28px; }
    .cabecera a { text-decoration: none; }
    .secciones { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; align-items: start; }
    @media (max-width: 1000px) { .secciones { grid-template-columns: minmax(0, 1fr); } }
    h2 { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 12px; font-size: 16px; }
    .preguntas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .preguntas li { padding: 12px; border-radius: 12px; background: var(--page-bg); }
    .preguntas li.dificil { background: #fdf0ee; }
    .enunciado { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; }
    .enunciado strong { color: var(--dark-blue); }
    .meta { display: block; margin: 4px 0 8px; font-size: 12px; color: var(--muted); }
    .ui-barra { height: 8px; }
    .barra-baja { --tono-bar: #d9b48f; }
    .num { text-align: center !important; }
    .persona { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: var(--light-cream); font-size: 11px; font-weight: bold; }
    .sin { color: var(--muted); font-size: 13px; }
    .baja { color: #c0392b; }
    .exportar { height: 32px; padding: 0 12px; font-size: 12px; }
  `,
  template: `
    <a class="volver" [routerLink]="rutaAula()" [queryParams]="{ tab: 'quiz' }"><fa-icon [icon]="faArrowLeft" /> Volver al aula</a>
    @if (datos.isLoading() && !datos.value()) {
      <p class="cargando">Cargando resultados…</p>
    } @else if (datos.value(); as r) {
      <header class="cabecera">
        <div class="titulos">
          <h1>{{ r.quiz.titulo }}</h1>
          <p>{{ r.quiz.preguntas }} preguntas · {{ r.quiz.puntajeMax }} puntos · {{ r.quiz.cerrado ? 'Cerró' : 'Cierra' }} el {{ fechaCorta(r.quiz.cierre) }} · {{ r.quiz.respondieron }} de {{ r.quiz.estudiantes }} respondieron</p>
        </div>
        <div class="anillos">
          <app-anillo etiqueta="Precisión" [valor]="r.quiz.precision" />
          <app-anillo etiqueta="Completado" [valor]="r.quiz.completado" [umbral]="0" />
        </div>
        <a class="ui-btn ui-btn--secundario" [routerLink]="rutaAula('quiz', r.quiz.id)"><fa-icon [icon]="faPen" /> Editar</a>
      </header>

      <div class="secciones">
        <section class="ui-card">
          <h2>Acierto por pregunta</h2>
          <ul class="preguntas" id="lista-preguntas">
            @for (p of r.preguntas; track p.id; let i = $index) {
              <li [class.dificil]="p.acierto !== null && p.acierto < 50">
                <div class="enunciado"><span>{{ i + 1 }}. {{ p.enunciado }}</span><strong>{{ p.acierto === null ? '—' : p.acierto + '%' }}</strong></div>
                <span class="meta">{{ tipo(p.tipo) }} · Respuesta: {{ correcta(p) }}@if (p.acierto !== null && p.acierto < 50) { · <fa-icon [icon]="faTriangleExclamation" /> conviene repasarla }</span>
                <div class="ui-barra" [class]="p.acierto !== null && p.acierto < 50 ? 'barra-baja' : 'tono-lima'"><span [style.width.%]="p.acierto ?? 0"></span></div>
              </li>
            }
          </ul>
        </section>

        <section class="ui-card">
          <h2>
            Estudiantes
            <button type="button" class="ui-btn ui-btn--secundario exportar" (click)="exportar()"><fa-icon [icon]="faFileCsv" /> Exportar CSV</button>
          </h2>
          <div class="ui-tabla-contenedor">
            <table class="ui-tabla" id="tabla-resultados">
              <thead><tr><th>Estudiante</th><th class="num">Mejor puntaje</th><th class="num">Intentos</th><th>Fecha</th></tr></thead>
              <tbody>
                @for (e of ordenados(); track e.estudianteId) {
                  <tr>
                    <td><span class="persona"><span class="avatar">{{ iniciales(e.nombre) }}</span> {{ e.nombre }}</span></td>
                    <td class="num">
                      @if (e.mejor; as m) { <strong [class.baja]="porcentaje(m.puntaje, m.puntajeMax) < 51">{{ m.puntaje }}/{{ m.puntajeMax }}</strong> ({{ porcentaje(m.puntaje, m.puntajeMax) }}%) }
                      @else { <span class="sin">No respondió</span> }
                    </td>
                    <td class="num">{{ e.intentos }}</td>
                    <td>{{ e.mejor ? fechaCorta(e.mejor.fin.slice(0, 10)) : '' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    } @else {
      <div class="ui-card"><app-empty-state [icono]="faCircleQuestion" titulo="No encontramos este quiz" /></div>
    }
  `,
})
export class QuizResultadosComponent {
  private session = inject(SessionService);
  private servicio = inject(QuizService);

  readonly asignacionId = input.required<string>();
  readonly quizId = input.required<string>();

  readonly fechaCorta = fechaCorta;
  readonly iniciales = iniciales;
  readonly porcentaje = porcentaje;
  readonly faArrowLeft = faArrowLeft;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faFileCsv = faFileCsv;
  readonly faPen = faPen;
  readonly faTriangleExclamation = faTriangleExclamation;

  readonly datos = rxResource({ params: () => Number(this.quizId()), stream: ({ params }) => this.servicio.resultados(params) });

  // Primero los que respondieron (de mayor a menor puntaje), después los que no
  readonly ordenados = computed(() =>
    [...(this.datos.value()?.estudiantes ?? [])].sort((a, b) => {
      const pa = a.mejor ? a.mejor.puntaje / a.mejor.puntajeMax : -1;
      const pb = b.mejor ? b.mejor.puntaje / b.mejor.puntajeMax : -1;
      return pb - pa || a.nombre.localeCompare(b.nombre);
    })
  );

  rutaAula(...segmentos: (string | number)[]) {
    return this.session.rutaRol('clases', this.asignacionId(), ...segmentos);
  }

  tipo(id: string): string {
    return TIPOS_PREGUNTA.find((t) => t.id === id)?.label ?? id;
  }

  correcta = respuestaCorrecta;

  exportar(): void {
    const r = this.datos.value();
    if (!r) return;
    descargarCsv(`resultados-${r.quiz.titulo}`, ['Estudiante', 'Puntaje', 'Puntaje máximo', '%', 'Intentos'],
      this.ordenados().map((e) => [e.nombre, e.mejor?.puntaje ?? null, e.mejor?.puntajeMax ?? r.quiz.puntajeMax, e.mejor ? porcentaje(e.mejor.puntaje, e.mejor.puntajeMax) : null, e.intentos]));
  }
}
