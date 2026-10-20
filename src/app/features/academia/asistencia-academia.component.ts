import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faUserCheck, faUserXmark, faVideo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { fechaCorta } from '../../core/utils/asistencia';
import { porcentaje } from '../../core/utils/reportes';
import { SesionesService } from '../../services/sesiones.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';

const estilos = `
  .indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px; }
  .indicador { display: flex; align-items: center; gap: 12px; }
  .indicador div { display: flex; flex-direction: column; }
  .indicador strong { font-size: 22px; }
  .indicador small { font-size: 13px; color: var(--muted); }
  .indicador.destacado { border-color: var(--lime-green); background: var(--lime-soft); }
  .alerta { background: #fdf0ee; color: #c0392b; }
  .cursos { display: flex; flex-direction: column; gap: 16px; }
  h2 { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 0 0 12px; font-size: 16px; }
  h2 small { font-size: 13px; font-weight: normal; color: var(--muted); }
  .num { text-align: center !important; }
  .si { color: var(--lime-strong); }
  .no { color: #c0392b; }
  .baja { color: #c0392b; font-weight: bold; }
  .sesiones { margin: 0; padding: 0; list-style: none; }
  .sesiones li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
  .sesiones li span { flex: 1; }
  .sesiones small { color: var(--muted); }
  .vacio { color: var(--muted); font-size: 14px; }
  a { color: var(--dark-blue); }
`;

// Asistencia de la academia para el docente: cada curso con sus sesiones finalizadas × estudiantes
@Component({
  selector: 'app-asistencia-academia-docente',
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  styles: estilos,
  template: `
    @if (resumen.isLoading() && !resumen.value().length) {
      <p class="vacio">Cargando asistencia…</p>
    } @else {
      <div class="cursos">
        @for (c of resumen.value(); track c.aulaId) {
          <section class="ui-card">
            <h2>{{ c.curso }} <small>{{ c.sesiones.length }} sesiones dictadas</small></h2>
            @if (c.sesiones.length && c.estudiantes.length) {
              <div class="ui-tabla-contenedor">
                <table class="ui-tabla">
                  <thead><tr><th>Estudiante</th>@for (s of c.sesiones; track s.id) { <th class="num" [title]="s.titulo">{{ fechaCorta(s.fecha) }}</th> }<th class="num">Asistencia</th></tr></thead>
                  <tbody>
                    @for (e of c.estudiantes; track e.estudianteId) {
                      <tr>
                        <td>{{ e.nombre }}</td>
                        @for (s of c.sesiones; track s.id) {
                          <td class="num">@if (e.presentes.has(s.id)) { <fa-icon class="si" [icon]="faCheck" /> } @else { <fa-icon class="no" [icon]="faXmark" /> }</td>
                        }
                        <td class="num" [class.baja]="e.porcentaje < 75">{{ e.porcentaje }}%</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="vacio">{{ c.estudiantes.length ? 'Todavía no hubo sesiones en este curso.' : 'Este curso todavía no tiene estudiantes.' }} <a [routerLink]="ruta('sesiones')">Ver sesiones</a></p>
            }
          </section>
        } @empty {
          <div class="ui-card"><app-empty-state [icono]="faVideo" titulo="Todavía no creaste cursos" /></div>
        }
      </div>
    }
  `,
})
export class AsistenciaAcademiaDocenteComponent {
  private session = inject(SessionService);
  private servicio = inject(SesionesService);

  readonly fechaCorta = fechaCorta;
  readonly faCheck = faCheck;
  readonly faVideo = faVideo;
  readonly faXmark = faXmark;

  readonly resumen = rxResource({ stream: () => this.servicio.resumenAsistencia(this.session.espacioActivo()!.id, this.session.usuarioId()!), defaultValue: [] });

  ruta(...s: string[]) {
    return this.session.rutaRol(...s);
  }
}

// Asistencia de la academia para el estudiante: su porcentaje y cada sesión a la que asistió o faltó
@Component({
  selector: 'app-asistencia-academia-estudiante',
  imports: [FaIconComponent, EmptyStateComponent],
  styles: estilos,
  template: `
    <div class="indicadores">
      <div class="ui-card indicador destacado">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faUserCheck" /></span>
        <div><strong>{{ resumen().porcentaje }}%</strong><small>de asistencia a sesiones en vivo</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faCheck" /></span>
        <div><strong>{{ resumen().asistidas }}</strong><small>sesiones asistidas</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono alerta"><fa-icon [icon]="faUserXmark" /></span>
        <div><strong>{{ resumen().faltas }}</strong><small>sesiones a las que faltaste</small></div>
      </div>
    </div>
    <div class="cursos">
      @for (c of porCurso(); track c.curso) {
        <section class="ui-card">
          <h2>{{ c.curso }} <small>{{ c.porcentaje }}% de asistencia</small></h2>
          <ul class="sesiones">
            @for (s of c.sesiones; track s.id) {
              <li>
                <fa-icon [class]="s.asisti ? 'si' : 'no'" [icon]="s.asisti ? faCheck : faXmark" />
                <span>{{ s.titulo }} <small>· {{ fechaCorta(s.fecha) }}</small></span>
                @if (s.grabacion) { <a [href]="s.grabacion" target="_blank" rel="noopener">Ver grabación</a> }
              </li>
            }
          </ul>
        </section>
      } @empty {
        <div class="ui-card"><app-empty-state [icono]="faVideo" titulo="Todavía no hubo sesiones en vivo" texto="Tu asistencia aparecerá cuando participes en las clases en vivo de tus cursos." /></div>
      }
    </div>
  `,
})
export class AsistenciaAcademiaEstudianteComponent {
  private session = inject(SessionService);
  private servicio = inject(SesionesService);

  readonly fechaCorta = fechaCorta;
  readonly faCheck = faCheck;
  readonly faUserCheck = faUserCheck;
  readonly faUserXmark = faUserXmark;
  readonly faVideo = faVideo;
  readonly faXmark = faXmark;

  private readonly sesiones = rxResource({ stream: () => this.servicio.sesionesEstudiante(this.session.espacioActivo()!.id, this.session.usuarioId()!), defaultValue: [] });
  private readonly pasadas = computed(() => this.sesiones.value().filter((s) => s.estado === 'finalizada').sort((a, b) => b.fecha.localeCompare(a.fecha)));
  readonly resumen = computed(() => {
    const asistidas = this.pasadas().filter((s) => s.asisti).length;
    return { asistidas, faltas: this.pasadas().length - asistidas, porcentaje: porcentaje(asistidas, this.pasadas().length) };
  });
  readonly porCurso = computed(() => {
    const cursos = [...new Set(this.pasadas().map((s) => s.curso))];
    return cursos.map((curso) => {
      const sesiones = this.pasadas().filter((s) => s.curso === curso);
      return { curso, sesiones, porcentaje: porcentaje(sesiones.filter((s) => s.asisti).length, sesiones.length) };
    });
  });
}
