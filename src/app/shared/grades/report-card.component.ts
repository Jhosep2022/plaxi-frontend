import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPrint, faSchool } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { promedio } from '../../core/utils/grades';
import { formatLongDate, todayIso } from '../../core/utils/attendance';
import { GradesApiService } from '../../services/grades-api.service';
import { InstitutionService } from '../../services/institution.service';
import { subjectIcon } from '../ui/academic-icons';

// Boletín de calificaciones de un estudiante (pantalla e impresión / PDF).
// Lo usan la dirección (Boletines), el estudiante y el padre.
@Component({
  selector: 'app-report-card',
  imports: [FaIconComponent],
  styleUrls: ['./report-card.component.css'],
  template: `
    @if (boletin.isLoading() && !boletin.value()) {
      <p class="ui-ayuda">Cargando boletín…</p>
    } @else if (boletin.error()) {
      <p class="ui-aviso" role="alert">No pudimos cargar el boletín. Intenta de nuevo.</p>
    } @else if (boletin.value(); as b) {
    <article class="ui-card boletin">
      <header class="encabezado">
        <span class="escudo">
          @if (institucion()?.logo; as logo) { <img [src]="logo" alt="" /> } @else { <fa-icon [icon]="faSchool" /> }
        </span>
        <div class="titulos">
          <small>{{ institucion()?.nombre ?? espacio() }}@if (institucion()?.codigoSie; as sie) { · SIE {{ sie }} }</small>
          <h2>Boletín de calificaciones</h2>
          <span>Gestión {{ b.gestion.anio }}@if (institucion()?.lema; as lema) { · “{{ lema }}” }</span>
        </div>
        <button type="button" class="ui-btn ui-btn--secundario no-imprimir" (click)="imprimir()"><fa-icon [icon]="faPrint" /> Imprimir / PDF</button>
      </header>

      <dl class="datos">
        <div><dt>Estudiante</dt><dd>{{ b.estudiante.nombre }}</dd></div>
        <div><dt>Curso</dt><dd>{{ b.paralelo ?? '—' }}</dd></div>
        <div><dt>Escala</dt><dd>Sobre {{ b.notaMaxima }} · aprueba con {{ b.notaAprobacion }}</dd></div>
        <div><dt>Emitido</dt><dd>{{ emitido }}</dd></div>
      </dl>

      <div class="ui-tabla-contenedor">
        <table class="ui-tabla tabla">
          <thead>
            <tr>
              <th>Materia</th>
              @for (p of b.gestion.periodos; track $index) {
                <th class="num">{{ p }}@if (!cerrado($index)) { <small>en curso</small> }</th>
              }
              <th class="num">Promedio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (f of b.filas; track f.materia.id) {
              <tr>
                <td>
                  <div class="materia">
                    <span class="ui-icono chico" [class]="'tono-' + f.materia.tono"><fa-icon [icon]="subjectIcon(f.materia.icono)" /></span>
                    <div><strong>{{ f.materia.nombre }}</strong><small>{{ f.docente }}</small></div>
                  </div>
                </td>
                @for (n of f.periodos; track $index) {
                  <td class="num" [class.reprobada]="n !== null && !aprueba(n)" [class.provisional]="!cerrado($index)">{{ n ?? '—' }}</td>
                }
                <td class="num anual" [class.reprobada]="f.anual !== null && !aprueba(f.anual)">{{ f.anual ?? '—' }}</td>
                <td>
                  @if (f.anual === null) {
                    <span class="ui-badge">Sin notas</span>
                  } @else if (aprueba(f.anual)) {
                    <span class="ui-badge tono-lima">Aprobado</span>
                  } @else {
                    <span class="ui-badge reprobado">Reprobado</span>
                  }
                </td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <th>Promedio general</th>
              @for (p of promediosPeriodo(); track $index) {
                <th class="num">{{ p ?? '—' }}</th>
              }
              <th class="num anual">{{ b.promedioGeneral ?? '—' }}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>

      <p class="nota-pie">Las notas de los periodos en curso son provisionales y pueden cambiar hasta el cierre del periodo.</p>

      @if (institucion()?.director; as director) {
        <footer class="firmas">
          <div><span class="linea"></span><strong>{{ director }}</strong><small>Director(a)</small></div>
          @if (institucion()?.subdirector; as sub) {
            <div><span class="linea"></span><strong>{{ sub }}</strong><small>Subdirector(a)</small></div>
          }
        </footer>
      }
    </article>
    }
  `,
})
export class ReportCardComponent {
  // The report card is computed by the API (closed periods from their frozen copy)
  readonly estudianteId = input.required<number>();
  readonly espacio = input.required<string>();

  readonly faPrint = faPrint;
  readonly faSchool = faSchool;
  readonly subjectIcon = subjectIcon;
  readonly emitido = formatLongDate(todayIso());

  private calificaciones = inject(GradesApiService);
  readonly boletin = rxResource({ params: () => this.estudianteId(), stream: ({ params }) => this.calificaciones.reportCard(params) });

  // Logo, name, motto and authorities of the school
  private session = inject(SessionService);
  private institucionService = inject(InstitutionService);
  private readonly institucionRes = rxResource({
    params: () => this.session.activeSpace()?.id ?? 0,
    stream: ({ params }) => (params ? this.institucionService.getDetails(params) : of(null)),
  });
  readonly institucion = computed(() => this.institucionRes.value());

  readonly promediosPeriodo = computed(() => {
    const b = this.boletin.value();
    return b ? b.gestion.periodos.map((_, i) => promedio(b.filas.map((f) => f.periodos[i] ?? null))) : [];
  });

  cerrado(periodo: number): boolean {
    return !!this.boletin.value()?.cerrados.includes(periodo);
  }

  aprueba(nota: number): boolean {
    return nota >= (this.boletin.value()?.notaAprobacion ?? 0);
  }

  imprimir(): void {
    window.print();
  }
}
