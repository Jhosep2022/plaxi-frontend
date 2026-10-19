import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faFileLines, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { aprobado, boletinDe, indiceNotas, promedio } from '../../../core/utils/calificaciones';
import { AcademicoService } from '../../../services/academico.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { BoletinComponent } from '../../../shared/calificaciones/boletin.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

// Boletines: notas de cada estudiante de un paralelo por periodo, y su boletín imprimible
@Component({
  selector: 'app-boletines',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, BoletinComponent],
  styles: `
    .cargando { color: var(--muted); }
    .filtros { display: flex; gap: 10px; flex-wrap: wrap; }
    .filtros select { width: 200px; }
    .buscar { position: relative; }
    .buscar fa-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; }
    .buscar .ui-input { width: 240px; padding-left: 34px; }
    .resumen { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .num { text-align: center !important; }
    td.num { font-weight: bold; }
    .provisional { color: var(--muted); }
    .reprobada { color: #c0392b; }
    .reprobado { background: #fdf0ee; color: #c0392b; }
    .volver { margin-bottom: 14px; }
    th small { display: block; font-weight: normal; color: var(--cream-strong); }
  `,
  template: `
    @if (elegido(); as est) {
      <button type="button" class="ui-btn ui-btn--secundario volver no-imprimir" (click)="elegidoId.set(0)"><fa-icon [icon]="faArrowLeft" /> Volver a {{ curso() }}</button>
      <app-boletin [datos]="datos.value()!" [estudiante]="est" [espacio]="espacio.nombre" />
    } @else {
      <app-page-header miga="Calificaciones" titulo="Boletines" descripcion="Notas finales de cada estudiante por periodo. Abre un boletín para verlo completo o imprimirlo.">
        <div class="filtros">
          <select class="ui-input" aria-label="Curso" (change)="paraleloId.set(+$any($event.target).value)">
            @for (p of paralelos.value(); track p.id) {
              <option [value]="p.id" [selected]="p.id === paraleloId()">{{ paraleloLabel(p) }}</option>
            }
          </select>
          <label class="buscar">
            <fa-icon [icon]="faMagnifyingGlass" />
            <input class="ui-input" placeholder="Buscar estudiante" [value]="busqueda()" (input)="busqueda.set($any($event.target).value)" aria-label="Buscar estudiante" />
          </label>
        </div>
      </app-page-header>

      @if ((paralelos.isLoading() || datos.isLoading()) && !datos.value()) {
        <p class="cargando">Cargando notas…</p>
      } @else if (datos.value(); as d) {
        <div class="resumen">
          <span class="ui-badge tono-crema">Promedio del curso: {{ promedioCurso() ?? '—' }}</span>
          <span class="ui-badge tono-lima">{{ filas().length - conReprobadas() }} sin materias reprobadas</span>
          <span class="ui-badge reprobado">{{ conReprobadas() }} con materias reprobadas</span>
        </div>
        <div class="ui-card">
          <div class="ui-tabla-contenedor">
            <table class="ui-tabla">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  @for (p of d.gestion.periodos; track $index) {
                    <th class="num">{{ p.nombre }}@if (!cerrado($index)) { <small>en curso</small> }</th>
                  }
                  <th class="num">Promedio</th>
                  <th>Materias reprobadas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (f of filasVisibles(); track f.estudiante.id) {
                  <tr>
                    <td><strong>{{ f.estudiante.nombre }}</strong></td>
                    @for (n of f.periodos; track $index) {
                      <td class="num" [class.provisional]="!cerrado($index)" [class.reprobada]="n !== null && !aprueba(n)">{{ n ?? '—' }}</td>
                    }
                    <td class="num" [class.reprobada]="f.anual !== null && !aprueba(f.anual)">{{ f.anual ?? '—' }}</td>
                    <td>
                      @if (f.reprobadas.length) {
                        <span class="ui-badge reprobado" [title]="f.reprobadas.join(', ')">{{ f.reprobadas.length }} · {{ f.reprobadas.join(', ') }}</span>
                      } @else {
                        <span class="ui-badge tono-lima">Ninguna</span>
                      }
                    </td>
                    <td><button type="button" class="ui-btn ui-btn--secundario" (click)="elegidoId.set(f.estudiante.id)"><fa-icon [icon]="faFileLines" /> Ver boletín</button></td>
                  </tr>
                } @empty {
                  <tr><td [attr.colspan]="d.gestion.periodos.length + 4">Ningún estudiante coincide con la búsqueda.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <div class="ui-card"><app-empty-state [icono]="faFileLines" titulo="Sin cursos" texto="Crea paralelos en la gestión activa para ver sus boletines." /></div>
      }
    }
  `,
})
export class BoletinesComponent {
  private academico = inject(AcademicoService);
  private calificaciones = inject(CalificacionesService);

  readonly faArrowLeft = faArrowLeft;
  readonly faFileLines = faFileLines;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly paraleloLabel = paraleloLabel;

  readonly espacio = inject(SessionService).espacioActivo()!;

  readonly paralelos = rxResource({
    stream: () => this.academico.paralelosActivos(this.espacio.id),
    defaultValue: [],
  });
  private readonly ordenados = computed(() => [...this.paralelos.value()].sort(compararParalelos));

  // Por defecto, el primer paralelo de secundaria (o el primero que haya)
  readonly paraleloId = linkedSignal(() => (this.ordenados().find((p) => p.nivel === 'secundaria') ?? this.ordenados()[0])?.id ?? 0);
  readonly curso = computed(() => {
    const p = this.paralelos.value().find((x) => x.id === this.paraleloId());
    return p ? paraleloLabel(p) : '';
  });

  readonly datos = rxResource({
    params: () => this.paraleloId(),
    stream: ({ params }) => (params ? this.calificaciones.datosDeParalelo(this.espacio.id, params) : of(null)),
  });

  readonly busqueda = signal('');
  readonly elegidoId = linkedSignal(() => {
    this.paraleloId();
    return 0;
  });
  readonly elegido = computed(() => this.datos.value()?.estudiantes.find((e) => e.id === this.elegidoId()) ?? null);

  readonly filas = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    const nota = indiceNotas(d.notas);
    return d.estudiantes.map((estudiante) => {
      const boletin = boletinDe(d, nota, estudiante.id);
      const periodos = d.gestion.periodos.map((_, i) => promedio(boletin.map((f) => f.periodos[i])));
      return {
        estudiante,
        periodos,
        anual: promedio(boletin.map((f) => f.anual)),
        reprobadas: boletin.filter((f) => f.anual !== null && !aprobado(d.config, f.anual)).map((f) => f.materia.nombre),
      };
    });
  });

  readonly filasVisibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return texto ? this.filas().filter((f) => f.estudiante.nombre.toLowerCase().includes(texto)) : this.filas();
  });

  readonly promedioCurso = computed(() => promedio(this.filas().map((f) => f.anual)));
  readonly conReprobadas = computed(() => this.filas().filter((f) => f.reprobadas.length).length);

  cerrado(periodo: number): boolean {
    return !!this.datos.value()?.cierres.some((c) => c.periodo === periodo);
  }

  aprueba(nota: number): boolean {
    const config = this.datos.value()?.config;
    return !!config && aprobado(config, nota);
  }
}
