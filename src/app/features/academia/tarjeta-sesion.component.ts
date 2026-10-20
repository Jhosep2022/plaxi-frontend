import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faCircleXmark, faClock, faFilm, faUsers, faVideo } from '@fortawesome/free-solid-svg-icons';
import { PLATAFORMAS } from '../../core/models/sesiones.model';
import { fechaCorta, hoyIso, sumarDias } from '../../core/utils/asistencia';
import { SesionVista } from '../../services/sesiones.service';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

// Fila de una sesión en vivo: fecha, tema, curso, horario, plataforma y estado; las acciones se proyectan
@Component({
  selector: 'app-tarjeta-sesion',
  imports: [FaIconComponent],
  styles: `
    :host { display: block; }
    .sesion { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .sesion.en-curso { border-color: var(--lime-green); box-shadow: 0 0 0 3px var(--lime-soft); }
    .fecha { width: 62px; flex-shrink: 0; padding: 8px 0; border-radius: 14px; background: var(--dark-blue); color: var(--text-light); text-align: center; }
    .fecha strong { display: block; font-size: 24px; line-height: 1; color: var(--lime-green); }
    .fecha small { font-size: 12px; text-transform: uppercase; }
    .finalizada .fecha { background: var(--page-bg); color: var(--muted); }
    .finalizada .fecha strong { color: var(--muted); }
    .texto { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 4px; }
    .texto strong { font-size: 16px; }
    .texto small { font-size: 13px; color: var(--muted); }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .vivo { animation: latido 1.6s infinite; }
    @keyframes latido { 50% { opacity: 0.55; } }
    .acciones { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .acciones ::ng-deep a.ui-btn { text-decoration: none; }
    .alerta { background: #fdf0ee; color: #c0392b; }
    a.grabacion { color: var(--lime-strong); font-weight: bold; font-size: 13px; text-decoration: none; }
  `,
  template: `
    <article class="ui-card sesion" [class.en-curso]="sesion().estado === 'en-curso'" [class.finalizada]="sesion().estado === 'finalizada'">
      <div class="fecha"><strong>{{ dia() }}</strong><small>{{ mes() }}</small></div>
      <div class="texto">
        <strong>{{ sesion().titulo }}</strong>
        <small>{{ sesion().curso }} · {{ cuando() }} · {{ sesion().inicio }} – {{ sesion().fin }}</small>
        @if (sesion().descripcion) { <small>{{ sesion().descripcion }}</small> }
        <div class="chips">
          <span class="ui-badge"><fa-icon [icon]="faVideo" /> {{ plataforma() }}</span>
          @switch (sesion().estado) {
            @case ('en-curso') { <span class="ui-badge tono-lima vivo">● En vivo ahora</span> }
            @case ('proxima') { <span class="ui-badge tono-crema"><fa-icon [icon]="faClock" /> Próxima</span> }
          }
          @if (docente() && sesion().estado !== 'proxima') { <span class="ui-badge tono-azul"><fa-icon [icon]="faUsers" /> {{ sesion().asistentes }} de {{ sesion().estudiantes }} asistieron</span> }
          @if (!docente() && sesion().estado === 'finalizada') {
            @if (sesion().asisti) { <span class="ui-badge tono-lima"><fa-icon [icon]="faCircleCheck" /> Asististe</span> }
            @else { <span class="ui-badge alerta"><fa-icon [icon]="faCircleXmark" /> No asististe</span> }
          }
          @if (sesion().grabacion) { <a class="grabacion" [href]="sesion().grabacion" target="_blank" rel="noopener"><fa-icon [icon]="faFilm" /> Ver grabación</a> }
        </div>
      </div>
      <div class="acciones"><ng-content /></div>
    </article>
  `,
})
export class TarjetaSesionComponent {
  readonly sesion = input.required<SesionVista>();
  readonly docente = input(false);

  readonly faCircleCheck = faCircleCheck;
  readonly faCircleXmark = faCircleXmark;
  readonly faClock = faClock;
  readonly faFilm = faFilm;
  readonly faUsers = faUsers;
  readonly faVideo = faVideo;

  readonly dia = computed(() => Number(this.sesion().fecha.slice(8, 10)));
  readonly mes = computed(() => MESES[Number(this.sesion().fecha.slice(5, 7)) - 1]);
  readonly plataforma = computed(() => PLATAFORMAS.find((p) => p.id === this.sesion().plataforma)?.label ?? '');
  readonly cuando = computed(() => {
    const f = this.sesion().fecha;
    return f === hoyIso() ? 'Hoy' : f === sumarDias(hoyIso(), 1) ? 'Mañana' : fechaCorta(f);
  });
}
