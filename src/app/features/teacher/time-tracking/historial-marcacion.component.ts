import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faClock, faQrcode, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { ESTADO_MARCACION_LABEL, Marcacion } from '../../../core/models/marcacion.model';
import { fechaCorta } from '../../../core/utils/asistencia';
import { MarcacionService } from '../../../services/marcacion.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

// Historial de marcaciones del docente con su puntualidad
@Component({
  selector: 'app-historial-marcacion',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent],
  styles: `
    .indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .indicador { display: flex; align-items: center; gap: 12px; }
    .indicador div { display: flex; flex-direction: column; }
    .indicador strong { font-size: 24px; }
    .indicador small { font-size: 13px; color: var(--muted); }
    .destacado { border-color: var(--lime-green); background: var(--lime-soft); }
    .ui-tabla td small { color: var(--muted); }
    .estado-a-tiempo, .estado-salida { background: var(--lime-soft); color: var(--lime-strong); }
    .estado-atraso, .estado-salida-anticipada { background: var(--light-cream); color: var(--cream-strong); }
    .sin { color: var(--muted); }
  `,
  template: `
    <app-page-header miga="Marcación" titulo="Mi historial" descripcion="Tus entradas y salidas registradas en el colegio.">
      <a class="ui-btn" [routerLink]="session.rutaRol('marcacion')"><fa-icon [icon]="faQrcode" /> Marcar</a>
    </app-page-header>

    <div class="indicadores">
      <div class="ui-card indicador destacado">
        <span class="ui-icono tono-lima"><fa-icon [icon]="faCircleCheck" /></span>
        <div><strong>{{ resumen().puntualidad }}%</strong><small>de puntualidad</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-crema"><fa-icon [icon]="faClock" /></span>
        <div><strong>{{ resumen().atrasos }}</strong><small>atrasos · {{ resumen().minutos }} min en total</small></div>
      </div>
      <div class="ui-card indicador">
        <span class="ui-icono tono-azul"><fa-icon [icon]="faRightFromBracket" /></span>
        <div><strong>{{ resumen().anticipadas }}</strong><small>salidas anticipadas</small></div>
      </div>
    </div>

    <div class="ui-card">
      @if (dias().length) {
        <div class="ui-tabla-contenedor">
          <table class="ui-tabla">
            <thead><tr><th>Día</th><th>Entrada</th><th>Salida</th></tr></thead>
            <tbody>
              @for (d of dias(); track d.fecha) {
                <tr>
                  <td><strong>{{ fechaCorta(d.fecha) }}</strong></td>
                  <td>
                    @if (d.entrada; as m) {
                      {{ m.hora }} <span class="ui-badge" [class]="'estado-' + m.estado">{{ estadoLabel[m.estado] }}@if (m.minutos) { · {{ m.minutos }} min }</span>
                    } @else { <span class="sin">Sin marcar</span> }
                  </td>
                  <td>
                    @if (d.salida; as m) {
                      {{ m.hora }}
                      @if (m.estado === 'salida-anticipada') { <span class="ui-badge" [class]="'estado-' + m.estado">{{ m.minutos }} min antes</span> }
                    } @else { <span class="sin">Sin marcar</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <app-empty-state [icono]="faQrcode" titulo="Todavía no tienes marcaciones" />
      }
    </div>
  `,
})
export class HistorialMarcacionComponent {
  protected readonly session = inject(SessionService);
  private marcacion = inject(MarcacionService);

  readonly estadoLabel = ESTADO_MARCACION_LABEL;
  readonly fechaCorta = fechaCorta;
  readonly faQrcode = faQrcode;
  readonly faCircleCheck = faCircleCheck;
  readonly faClock = faClock;
  readonly faRightFromBracket = faRightFromBracket;

  readonly marcaciones = rxResource({ stream: () => this.marcacion.marcacionesDe(this.session.usuarioId()!), defaultValue: [] });

  readonly dias = computed(() => {
    const porFecha = new Map<string, { entrada?: Marcacion; salida?: Marcacion }>();
    for (const m of this.marcaciones.value()) porFecha.set(m.fecha, { ...porFecha.get(m.fecha), [m.tipo]: m });
    return [...porFecha.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([fecha, d]) => ({ fecha, ...d }));
  });

  readonly resumen = computed(() => {
    const entradas = this.marcaciones.value().filter((m) => m.tipo === 'entrada');
    const atrasos = entradas.filter((m) => m.estado === 'atraso');
    return {
      puntualidad: entradas.length ? Math.round(((entradas.length - atrasos.length) / entradas.length) * 100) : 100,
      atrasos: atrasos.length,
      minutos: atrasos.reduce((s, m) => s + m.minutos, 0),
      anticipadas: this.marcaciones.value().filter((m) => m.estado === 'salida-anticipada').length,
    };
  });
}
