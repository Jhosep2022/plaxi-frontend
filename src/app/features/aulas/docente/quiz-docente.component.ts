import { Component, inject, input, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartColumn, faCircleQuestion, faClock, faPen, faPlus, faRotateRight, faStar, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { fechaCorta } from '../../../core/utils/asistencia';
import { AulaResumen } from '../../../services/aulas.service';
import { QuizDocente, QuizService } from '../../../services/quiz.service';
import { AnilloComponent } from '../../../shared/aulas/anillo.component';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

// Pestaña Quiz del aula (docente): tarjetas con precisión y completado, publicar, editar y ver resultados
@Component({
  selector: 'app-quiz-docente',
  imports: [FaIconComponent, RouterLink, AnilloComponent, EmptyStateComponent],
  styles: `
    .barra { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
    .quiz { display: flex; flex-direction: column; gap: 14px; padding: 12px; }
    .banda { position: relative; height: 92px; border-radius: 12px; background: var(--lime-soft); overflow: hidden; }
    .banda.borrador { background: var(--page-bg); }
    .banda.cerrado { background: var(--light-cream); }
    .banda .icono { position: absolute; right: 18px; top: 50%; transform: translateY(-50%) rotate(-8deg); width: 58px; height: 58px; display: grid; place-items: center; border-radius: 16px; background: var(--text-light); font-size: 24px; box-shadow: 0 8px 18px rgba(10, 10, 35, 0.12); }
    .banda .circulo { position: absolute; left: -20px; bottom: -40px; width: 110px; height: 110px; border-radius: 50%; background: var(--lime-green); opacity: 0.35; }
    .banda.borrador .circulo { background: var(--line); }
    .banda.cerrado .circulo { background: #d9b48f; }
    .insignia { position: absolute; top: 10px; left: 10px; display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 8px; background: rgba(10, 10, 35, 0.75); color: var(--text-light); font-size: 12px; font-weight: bold; }
    .estado { position: absolute; bottom: 10px; left: 10px; }
    .cuerpo { display: flex; flex-direction: column; gap: 12px; padding: 0 6px; flex: 1; }
    h3 { margin: 0; font-size: 16px; }
    .anillos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .anillos app-anillo + app-anillo { padding-left: 12px; border-left: 1px solid var(--line); }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { padding: 5px 10px; border-radius: 8px; background: var(--page-bg); font-size: 12px; color: var(--muted); }
    .chip.nota { background: var(--blue-soft); color: var(--dark-blue); font-weight: bold; }
    .pie { display: flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 10px; border-top: 1px solid var(--line); }
    .pie small { margin-right: auto; font-size: 12px; color: var(--muted); }
    .pie a { text-decoration: none; }
    .chico { height: 32px; padding: 0 10px; font-size: 12px; }
    .vacio { grid-column: 1 / -1; }
  `,
  template: `
    <div class="barra">
      <span class="ui-ayuda">Cuestionarios con corrección automática. Si cuentan para la nota, el puntaje pasa a la planilla.</span>
      <a class="ui-btn" [routerLink]="ruta('nuevo')"><fa-icon [icon]="faPlus" /> Nuevo quiz</a>
    </div>
    <div class="grilla">
      @for (q of quizzes.value(); track q.id) {
        <article class="ui-card quiz">
          <div class="banda" [class.borrador]="!q.publicado" [class.cerrado]="q.publicado && q.cerrado">
            <span class="circulo"></span>
            <span class="insignia"><fa-icon [icon]="faUsers" /> {{ q.respondieron }} respondieron</span>
            <span class="estado ui-badge" [class]="!q.publicado ? '' : q.cerrado ? 'tono-crema' : 'tono-lima'">{{ !q.publicado ? 'Borrador' : q.cerrado ? 'Cerrado' : 'Abierto' }}</span>
            <span class="icono"><fa-icon [icon]="faCircleQuestion" /></span>
          </div>
          <div class="cuerpo">
            <h3>{{ q.titulo }}</h3>
            <div class="anillos">
              <app-anillo etiqueta="Precisión" [valor]="q.precision" />
              <app-anillo etiqueta="Completado" [valor]="q.completado" [umbral]="0" />
            </div>
            <div class="chips">
              <span class="chip">{{ q.preguntas }} {{ q.preguntas === 1 ? 'pregunta' : 'preguntas' }}</span>
              <span class="chip"><fa-icon [icon]="faClock" /> {{ q.tiempoMin ? q.tiempoMin + ' min' : 'Sin límite' }}</span>
              <span class="chip"><fa-icon [icon]="faRotateRight" /> {{ q.intentos }} {{ q.intentos === 1 ? 'intento' : 'intentos' }}</span>
              @if (q.cuentaParaNota) { <span class="chip nota"><fa-icon [icon]="faStar" /> Cuenta para nota</span> }
            </div>
            <div class="pie">
              <small>{{ q.cerrado ? 'Cerró' : 'Cierra' }} el {{ fechaCorta(q.cierre) }}</small>
              @if (q.publicado) {
                <a class="ui-btn ui-btn--secundario chico" [routerLink]="ruta(q.id, 'resultados')"><fa-icon [icon]="faChartColumn" /> Resultados</a>
              } @else {
                <button type="button" class="ui-btn chico" (click)="publicar(q, true)">Publicar</button>
              }
              <a class="ui-btn ui-btn--icono" [routerLink]="ruta(q.id)" [attr.aria-label]="'Editar ' + q.titulo"><fa-icon [icon]="faPen" /></a>
              <button type="button" class="ui-btn ui-btn--icono" (click)="eliminar(q)" [attr.aria-label]="'Eliminar ' + q.titulo"><fa-icon [icon]="faTrash" /></button>
            </div>
          </div>
        </article>
      } @empty {
        <div class="ui-card vacio">
          <app-empty-state [icono]="faCircleQuestion" titulo="Todavía no hay quiz en esta clase" texto="Arma un cuestionario de repaso o evaluación con corrección automática.">
            <a class="ui-btn" [routerLink]="ruta('nuevo')"><fa-icon [icon]="faPlus" /> Crear el primer quiz</a>
          </app-empty-state>
        </div>
      }
    </div>
  `,
})
export class QuizDocenteComponent {
  private session = inject(SessionService);
  private servicio = inject(QuizService);
  private avisos = inject(AvisosService);

  readonly aula = input.required<AulaResumen>();
  readonly cambio = output<void>();

  readonly fechaCorta = fechaCorta;
  readonly faChartColumn = faChartColumn;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faClock = faClock;
  readonly faPen = faPen;
  readonly faPlus = faPlus;
  readonly faRotateRight = faRotateRight;
  readonly faStar = faStar;
  readonly faTrash = faTrash;
  readonly faUsers = faUsers;

  readonly quizzes = rxResource({ params: () => this.aula().id, stream: ({ params }) => this.servicio.quizzesDocente(params), defaultValue: [] });

  ruta(...segmentos: (string | number)[]) {
    return this.session.rutaRol('clases', this.aula().id, 'quiz', ...segmentos);
  }

  async publicar(q: QuizDocente, publicado: boolean): Promise<void> {
    try {
      await firstValueFrom(this.servicio.cambiarPublicado(q.id, publicado));
      this.avisos.exito(publicado ? 'Quiz publicado: tus estudiantes ya pueden responderlo.' : 'El quiz pasó a borrador.');
      this.quizzes.reload();
      this.cambio.emit();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  async eliminar(q: QuizDocente): Promise<void> {
    if (!confirm(`¿Eliminar "${q.titulo}"?${q.respondieron ? ` Se perderán las respuestas de ${q.respondieron} estudiantes.` : ''}`)) return;
    try {
      await firstValueFrom(this.servicio.eliminar(q.id));
      this.avisos.exito('Quiz eliminado.');
      this.quizzes.reload();
      this.cambio.emit();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }
}
