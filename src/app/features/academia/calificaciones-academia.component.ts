import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartColumn, faCircleQuestion, faFileCsv, faStar } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { fechaCorta } from '../../core/utils/asistencia';
import { descargarCsv } from '../../core/utils/reportes';
import { AulasService } from '../../services/aulas.service';
import { QuizService } from '../../services/quiz.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { iconoMateria } from '../../shared/ui/iconos-academicos';

const APROBACION = 51;

const estilos = `
  .cursos { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .curso { padding: 8px 14px; border: 1px solid var(--line); border-radius: 20px; background: var(--text-light); color: var(--dark-blue); font: inherit; font-size: 13px; cursor: pointer; }
  .curso.activo { border-color: var(--dark-blue); background: var(--dark-blue); color: var(--text-light); font-weight: bold; }
  .resumen { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  h2 { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 12px; font-size: 16px; }
  .num { text-align: center !important; }
  th a { color: var(--dark-blue); text-decoration: none; }
  th small { display: block; font-weight: normal; color: var(--muted); }
  .baja { color: #c0392b; font-weight: bold; }
  .sin { color: var(--muted); }
  .exportar { height: 32px; padding: 0 12px; font-size: 12px; }
  .vacio { color: var(--muted); font-size: 14px; }
  .tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
  .tarjeta header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .tarjeta header div { flex: 1; display: flex; flex-direction: column; }
  .tarjeta header small { font-size: 12px; color: var(--muted); }
  .promedio { min-width: 58px; padding: 6px 10px; border-radius: 12px; background: var(--lime-soft); font-size: 22px; font-weight: bold; text-align: center; }
  .promedio.bajo { background: #fdf0ee; color: #c0392b; }
  .promedio.vacio-p { background: var(--page-bg); color: var(--muted); }
  .quizzes { margin: 0; padding: 0; list-style: none; }
  .quizzes li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
  .quizzes li span { display: flex; flex-direction: column; }
  .quizzes small { font-size: 12px; color: var(--muted); }
  .tarjeta a.ui-btn { margin-top: 12px; text-decoration: none; }
`;

// Calificaciones del docente de academia: por curso, el mejor porcentaje de cada estudiante en cada quiz
@Component({
  selector: 'app-calificaciones-academia-docente',
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  styles: estilos,
  template: `
    @if (cursos.isLoading() && !cursos.value().length) {
      <p class="vacio">Cargando…</p>
    } @else if (!cursos.value().length) {
      <div class="ui-card"><app-empty-state [icono]="faStar" titulo="Todavía no creaste cursos" /></div>
    } @else {
      <div class="cursos" role="tablist">
        @for (c of cursos.value(); track c.id) {
          <button type="button" class="curso" [class.activo]="c.id === cursoId()" (click)="cursoId.set(c.id)">{{ c.nombre }}</button>
        }
      </div>
      @if (notas.value(); as n) {
        <section class="ui-card">
          <h2>
            Notas de los quiz
            <button type="button" class="ui-btn ui-btn--secundario exportar" (click)="exportar()" [disabled]="!n.estudiantes.length"><fa-icon [icon]="faFileCsv" /> Exportar CSV</button>
          </h2>
          <div class="resumen">
            <span class="ui-badge tono-crema">Promedio del curso: {{ promedioCurso() ?? '—' }}</span>
            <span class="ui-badge">{{ n.quizzes.length }} quiz publicados</span>
            <span class="ui-badge tono-lima">Aprueba con {{ aprobacion }}%</span>
          </div>
          @if (n.quizzes.length && n.estudiantes.length) {
            <div class="ui-tabla-contenedor">
              <table class="ui-tabla" id="tabla-notas-academia">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    @for (q of n.quizzes; track q.id) {
                      <th class="num"><a [routerLink]="session.rutaRol('clases', cursoId(), 'quiz', q.id, 'resultados')">{{ q.titulo }}</a><small>{{ q.cerrado ? 'Cerró' : 'Cierra' }} {{ fechaCorta(q.cierre) }}</small></th>
                    }
                    <th class="num">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of n.estudiantes; track e.estudianteId) {
                    <tr>
                      <td>{{ e.nombre }}</td>
                      @for (q of n.quizzes; track q.id) {
                        <td class="num">
                          @if (e.notas.get(q.id); as p) { <span [class.baja]="p < aprobacion">{{ p }}%</span> }
                          @else if (e.notas.has(q.id)) { <span class="baja">0%</span> }
                          @else { <span class="sin">{{ q.cerrado ? 'No respondió' : 'Pendiente' }}</span> }
                        </td>
                      }
                      <td class="num"><strong [class.baja]="e.promedio !== null && e.promedio < aprobacion">{{ e.promedio ?? '—' }}</strong></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="vacio">{{ n.estudiantes.length ? 'Este curso todavía no tiene quiz publicados.' : 'Este curso todavía no tiene estudiantes.' }} <a [routerLink]="session.rutaRol('clases', cursoId())" [queryParams]="{ tab: 'quiz' }">Ir al aula</a></p>
          }
        </section>
      }
    }
  `,
})
export class CalificacionesAcademiaDocenteComponent {
  readonly session = inject(SessionService);
  private aulas = inject(AulasService);
  private quiz = inject(QuizService);

  readonly aprobacion = APROBACION;
  readonly fechaCorta = fechaCorta;
  readonly faFileCsv = faFileCsv;
  readonly faStar = faStar;

  readonly cursos = rxResource({
    stream: () => this.aulas.aulasDocente(this.session.espacioActivo()!.id, this.session.usuarioId()!).pipe(map((as) => as.filter((a) => a.tipo === 'curso').sort((a, b) => a.nombre.localeCompare(b.nombre)))),
    defaultValue: [],
  });
  readonly cursoId = linkedSignal(() => this.cursos.value()[0]?.id ?? 0);
  readonly notas = rxResource({ params: () => this.cursoId(), stream: ({ params }) => (params ? this.quiz.notasCurso(params) : of(null)) });
  readonly promedioCurso = computed(() => {
    const ps = (this.notas.value()?.estudiantes ?? []).map((e) => e.promedio).filter((p): p is number => p !== null);
    return ps.length ? Math.round(ps.reduce((s, p) => s + p, 0) / ps.length) : null;
  });

  exportar(): void {
    const n = this.notas.value();
    const curso = this.cursos.value().find((c) => c.id === this.cursoId());
    if (!n || !curso) return;
    descargarCsv(`notas-${curso.nombre}`, ['Estudiante', ...n.quizzes.map((q) => q.titulo), 'Promedio'],
      n.estudiantes.map((e) => [e.nombre, ...n.quizzes.map((q) => e.notas.get(q.id) ?? null), e.promedio]));
  }
}

// "Mis notas" del estudiante de academia: por curso, su promedio y el resultado de cada quiz
@Component({
  selector: 'app-calificaciones-academia-estudiante',
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  styles: estilos,
  template: `
    @if (cursos.isLoading() && !cursos.value()) {
      <p class="vacio">Cargando…</p>
    } @else {
      <div class="tarjetas">
        @for (c of cursos.value() ?? []; track c.aula.id) {
          <article class="ui-card tarjeta">
            <header>
              <span class="ui-icono" [class]="'tono-' + c.aula.tono"><fa-icon [icon]="iconoMateria(c.aula.icono)" /></span>
              <div><strong>{{ c.aula.nombre }}</strong><small>Prof. {{ c.aula.docente }}</small></div>
              <span class="promedio" [class.bajo]="c.promedio !== null && c.promedio < aprobacion" [class.vacio-p]="c.promedio === null">{{ c.promedio ?? '—' }}</span>
            </header>
            <ul class="quizzes">
              @for (q of c.quizzes; track q.id) {
                <li>
                  <span>{{ q.titulo }}<small>{{ q.cerrado ? 'Cerró' : 'Cierra' }} el {{ fechaCorta(q.cierre) }}</small></span>
                  @if (c.notas.has(q.id)) { <strong [class.baja]="c.notas.get(q.id)! < aprobacion">{{ c.notas.get(q.id) }}%</strong> }
                  @else if (q.cerrado) { <span class="ui-badge">No respondiste</span> }
                  @else { <span class="ui-badge tono-crema">Pendiente</span> }
                </li>
              } @empty {
                <li class="vacio">Este curso todavía no tiene quiz.</li>
              }
            </ul>
            <a class="ui-btn ui-btn--secundario" [routerLink]="session.rutaRol('aulas', c.aula.id)"><fa-icon [icon]="faCircleQuestion" /> Ir al curso</a>
          </article>
        } @empty {
          <div class="ui-card"><app-empty-state [icono]="faChartColumn" titulo="Todavía no estás en ningún curso" /></div>
        }
      </div>
    }
  `,
})
export class CalificacionesAcademiaEstudianteComponent {
  readonly session = inject(SessionService);
  private aulas = inject(AulasService);
  private quiz = inject(QuizService);

  readonly aprobacion = APROBACION;
  readonly fechaCorta = fechaCorta;
  readonly iconoMateria = iconoMateria;
  readonly faChartColumn = faChartColumn;
  readonly faCircleQuestion = faCircleQuestion;

  private readonly estudianteId = this.session.usuarioId()!;
  readonly cursos = rxResource({
    stream: () =>
      this.aulas.aulasEstudiante(this.session.espacioActivo()!.id, this.estudianteId).pipe(
        switchMap((aulas) => {
          const cursos = aulas.filter((a) => a.tipo === 'curso');
          if (!cursos.length) return of([]);
          return forkJoin(cursos.map((aula) => this.quiz.notasCurso(aula.id).pipe(map((n) => {
            const mia = n.estudiantes.find((e) => e.estudianteId === this.estudianteId);
            return { aula, quizzes: n.quizzes, notas: mia?.notas ?? new Map<number, number>(), promedio: mia?.promedio ?? null };
          }))));
        })
      ),
  });
}
