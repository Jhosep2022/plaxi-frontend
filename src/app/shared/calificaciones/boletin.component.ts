import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPrint, faSchool } from '@fortawesome/free-solid-svg-icons';
import { paraleloLabel } from '../../core/models/academico.model';
import { aprobado, boletinDe, indiceNotas, promedio } from '../../core/utils/calificaciones';
import { fechaLarga, hoyIso } from '../../core/utils/asistencia';
import { DatosParalelo } from '../../services/calificaciones.service';
import { InstitucionService } from '../../services/institucion.service';
import { iconoMateria } from '../ui/iconos-academicos';

// Boletín de calificaciones de un estudiante (pantalla e impresión / PDF).
// Lo usan la dirección (Boletines), el estudiante y el padre.
@Component({
  selector: 'app-boletin',
  imports: [FaIconComponent],
  styleUrls: ['./boletin.component.css'],
  template: `
    <article class="ui-card boletin">
      <header class="encabezado">
        <span class="escudo">
          @if (institucion()?.logo; as logo) { <img [src]="logo" alt="" /> } @else { <fa-icon [icon]="faSchool" /> }
        </span>
        <div class="titulos">
          <small>{{ institucion()?.nombre ?? espacio() }}@if (institucion()?.codigoSie; as sie) { · SIE {{ sie }} }</small>
          <h2>Boletín de calificaciones</h2>
          <span>Gestión {{ datos().gestion.anio }}@if (institucion()?.lema; as lema) { · “{{ lema }}” }</span>
        </div>
        <button type="button" class="ui-btn ui-btn--secundario no-imprimir" (click)="imprimir()"><fa-icon [icon]="faPrint" /> Imprimir / PDF</button>
      </header>

      <dl class="datos">
        <div><dt>Estudiante</dt><dd>{{ estudiante().nombre }}</dd></div>
        <div><dt>Curso</dt><dd>{{ curso() }}</dd></div>
        <div><dt>Escala</dt><dd>Sobre {{ datos().config.notaMaxima }} · aprueba con {{ datos().config.notaAprobacion }}</dd></div>
        <div><dt>Emitido</dt><dd>{{ emitido }}</dd></div>
      </dl>

      <div class="ui-tabla-contenedor">
        <table class="ui-tabla tabla">
          <thead>
            <tr>
              <th>Materia</th>
              @for (p of datos().gestion.periodos; track $index) {
                <th class="num">{{ p.nombre }}@if (!cerrado($index)) { <small>en curso</small> }</th>
              }
              <th class="num">Promedio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (f of filas(); track f.materia.id) {
              <tr>
                <td>
                  <div class="materia">
                    <span class="ui-icono chico" [class]="'tono-' + f.materia.tono"><fa-icon [icon]="iconoMateria(f.materia.icono)" /></span>
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
              <th class="num anual">{{ promedioGeneral() ?? '—' }}</th>
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
  `,
})
export class BoletinComponent {
  readonly datos = input.required<DatosParalelo>();
  readonly estudiante = input.required<{ id: number; nombre: string }>();
  readonly espacio = input.required<string>();

  readonly faPrint = faPrint;
  readonly faSchool = faSchool;
  readonly iconoMateria = iconoMateria;
  readonly emitido = fechaLarga(hoyIso());

  // Logo, nombre, lema y autoridades de la institución
  private institucionService = inject(InstitucionService);
  private readonly institucionRes = rxResource({ params: () => this.datos().paralelo.espacioId, stream: ({ params }) => this.institucionService.datos(params) });
  readonly institucion = computed(() => this.institucionRes.value());

  readonly curso = computed(() => paraleloLabel(this.datos().paralelo));
  readonly filas = computed(() => boletinDe(this.datos(), indiceNotas(this.datos().notas), this.estudiante().id));
  readonly promediosPeriodo = computed(() => this.datos().gestion.periodos.map((_, i) => promedio(this.filas().map((f) => f.periodos[i]))));
  readonly promedioGeneral = computed(() => promedio(this.filas().map((f) => f.anual)));

  cerrado(periodo: number): boolean {
    return this.datos().cierres.some((c) => c.periodo === periodo);
  }

  aprueba(nota: number): boolean {
    return aprobado(this.datos().config, nota);
  }

  imprimir(): void {
    window.print();
  }
}
