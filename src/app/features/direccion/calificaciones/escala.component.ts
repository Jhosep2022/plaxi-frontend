import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, applyEach, form, max, min, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { ConfigCalificacion, configPorDefecto } from '../../../core/models/calificaciones.model';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../academico/academico.ui';

// Colores de los segmentos de la barra de ponderación (paleta QuizWiz)
const COLORES = ['var(--lime-green)', 'var(--dark-blue)', '#d9b48f', 'var(--lime-strong)', 'var(--cream-strong)', 'var(--muted)'];

const aModelo = (c: ConfigCalificacion) => ({
  notaMaxima: c.notaMaxima,
  notaAprobacion: c.notaAprobacion,
  criterios: c.criterios.map((x) => ({ ...x })),
});

// Escala de notas (máxima y de aprobación) y criterios de evaluación con su peso
@Component({
  selector: 'app-escala',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent],
  styles: `
    .secciones { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
    h2 { margin: 0 0 4px; font-size: 17px; }
    .ui-ayuda { display: block; margin-bottom: 14px; }
    .escala { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
    .ejemplo { margin: 14px 0 0; }
    .barra { display: flex; height: 34px; margin-bottom: 16px; border-radius: 10px; overflow: hidden; background: var(--line); }
    .barra span { display: grid; place-items: center; min-width: 0; overflow: hidden; color: var(--text-light); font-size: 12px; font-weight: bold; white-space: nowrap; transition: width 0.2s; }
    .barra span.claro { color: var(--dark-blue); }
    .criterio { display: grid; grid-template-columns: 14px 1fr 120px 38px; align-items: start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .punto { width: 14px; height: 14px; margin-top: 12px; border-radius: 4px; }
    .porcentaje { display: flex; align-items: center; gap: 6px; }
    .porcentaje .ui-input { text-align: right; }
    .suma { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .total { font-weight: bold; }
    .total.mal { color: #c0392b; }
    .pie { display: flex; gap: 10px; }
  `,
  template: `
    <app-page-header miga="Calificaciones" titulo="Escala y ponderación" descripcion="Cómo se califica en el colegio: sobre cuánto es la nota, con cuánto se aprueba y cuánto pesa cada criterio en la nota final.">
      <button type="button" class="ui-btn ui-btn--secundario" (click)="restablecer()"><fa-icon [icon]="faRotateLeft" /> Valores por defecto</button>
      <button type="button" class="ui-btn" [disabled]="guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
    </app-page-header>

    <form class="secciones" (submit)="$event.preventDefault(); guardar()" novalidate>
      <section class="ui-card">
        <h2>Escala de notas</h2>
        <span class="ui-ayuda">Todas las actividades se califican sobre la nota máxima.</span>
        <div class="escala">
          <div class="ui-campo">
            <label for="es-max">Nota máxima</label>
            <input id="es-max" type="number" class="ui-input" [formField]="formulario.notaMaxima" />
            @if (formulario.notaMaxima().invalid()) {
              <span class="ui-error">{{ formulario.notaMaxima().errors()[0].message }}</span>
            }
          </div>
          <div class="ui-campo">
            <label for="es-apr">Nota mínima para aprobar</label>
            <input id="es-apr" type="number" class="ui-input" [formField]="formulario.notaAprobacion" />
            @if (formulario.notaAprobacion().invalid()) {
              <span class="ui-error">{{ formulario.notaAprobacion().errors()[0].message }}</span>
            }
          </div>
        </div>
      </section>

      <section class="ui-card">
        <h2>Criterios de evaluación</h2>
        <span class="ui-ayuda">El docente registra actividades en cada criterio. La nota final es el promedio de cada criterio multiplicado por su peso.</span>

        <div class="barra" aria-hidden="true">
          @for (c of modelo().criterios; track $index) {
            <span [style.width.%]="c.porcentaje" [style.background]="color($index)" [class.claro]="$index % 3 !== 1">
              @if (c.porcentaje >= 8) { {{ c.nombre }} {{ c.porcentaje }}% }
            </span>
          }
        </div>

        @for (c of formulario.criterios; track $index) {
          <div class="criterio">
            <span class="punto" [style.background]="color($index)"></span>
            <div class="ui-campo">
              <input class="ui-input" [id]="'cr-nombre-' + $index" [formField]="c.nombre" aria-label="Nombre del criterio" />
              @if (c.nombre().touched() && c.nombre().invalid()) {
                <span class="ui-error">{{ c.nombre().errors()[0].message }}</span>
              }
            </div>
            <div class="ui-campo">
              <span class="porcentaje">
                <input type="number" class="ui-input" [id]="'cr-pct-' + $index" [formField]="c.porcentaje" aria-label="Peso en porcentaje" /> %
              </span>
              @if (c.porcentaje().invalid()) {
                <span class="ui-error">{{ c.porcentaje().errors()[0].message }}</span>
              }
            </div>
            <button type="button" class="ui-btn ui-btn--icono" [disabled]="modelo().criterios.length === 1" (click)="quitar($index)" aria-label="Quitar criterio"><fa-icon [icon]="faTrash" /></button>
          </div>
        }

        <div class="suma">
          <button type="button" class="ui-btn ui-btn--secundario" (click)="agregar()"><fa-icon [icon]="faPlus" /> Agregar criterio</button>
          <span class="total" [class.mal]="suma() !== 100">Total: {{ suma() }}%@if (suma() !== 100) { · debe sumar 100% }</span>
        </div>
        <p class="ui-aviso ejemplo">
          Ejemplo: con {{ ejemplo() }}, la nota final sería <strong>{{ notaEjemplo() }}</strong> sobre {{ modelo().notaMaxima }}.
          Si cambias los pesos, los promedios se recalculan con los nuevos valores.
        </p>
      </section>
    </form>
  `,
})
export class EscalaComponent {
  private calificaciones = inject(CalificacionesService);
  private avisos = inject(AvisosService);
  private readonly espacio = inject(SessionService).espacioActivo()!;

  readonly faPlus = faPlus;
  readonly faRotateLeft = faRotateLeft;
  readonly faTrash = faTrash;

  readonly config = rxResource({ stream: () => this.calificaciones.config(this.espacio.id, this.espacio.tipo) });
  readonly modelo = linkedSignal(() => aModelo(this.config.value() ?? configPorDefecto(this.espacio.id, this.espacio.tipo)));
  readonly formulario = form(this.modelo, (s) => {
    required(s.notaMaxima, { message: 'Indica la nota máxima.' });
    min(s.notaMaxima, 1, { message: 'Debe ser mayor a 0.' });
    max(s.notaMaxima, 1000, { message: 'Debe ser como máximo 1000.' });
    required(s.notaAprobacion, { message: 'Indica la nota de aprobación.' });
    min(s.notaAprobacion, 1, { message: 'Debe ser mayor a 0.' });
    validate(s.notaAprobacion, ({ value, valueOf }) =>
      value() > valueOf(s.notaMaxima) ? { kind: 'rango', message: 'No puede ser mayor que la nota máxima.' } : undefined
    );
    applyEach(s.criterios, (c) => {
      required(c.nombre, { message: 'Ponle un nombre.' });
      min(c.porcentaje, 1, { message: 'Mínimo 1%.' });
      max(c.porcentaje, 100, { message: 'Máximo 100%.' });
    });
    validate(s.criterios, ({ value }) => {
      const suma = value().reduce((t, c) => t + (Number(c.porcentaje) || 0), 0);
      return suma !== 100 ? { kind: 'suma', message: `Los pesos deben sumar 100% (ahora ${suma}%).` } : undefined;
    });
  });

  readonly suma = computed(() => this.modelo().criterios.reduce((t, c) => t + (Number(c.porcentaje) || 0), 0));

  // Ejemplo de cálculo: notas de muestra por criterio
  private readonly muestras = computed(() => this.modelo().criterios.map((_, i) => Math.round(this.modelo().notaMaxima * [0.9, 0.7, 0.8, 0.6, 0.75, 0.85][i % 6])));
  readonly ejemplo = computed(() => this.modelo().criterios.map((c, i) => `${c.nombre || 'Criterio'} ${this.muestras()[i]}`).join(', '));
  readonly notaEjemplo = computed(() => {
    const suma = this.suma();
    return suma ? Math.round(this.modelo().criterios.reduce((t, c, i) => t + this.muestras()[i] * (Number(c.porcentaje) || 0), 0) / suma) : 0;
  });

  readonly guardando = signal(false);

  color(i: number): string {
    return COLORES[i % COLORES.length];
  }

  agregar(): void {
    this.modelo.update((m) => ({ ...m, criterios: [...m.criterios, { id: 0, nombre: '', porcentaje: 0 }] }));
  }

  quitar(indice: number): void {
    this.modelo.update((m) => ({ ...m, criterios: m.criterios.filter((_, i) => i !== indice) }));
  }

  restablecer(): void {
    const defecto = configPorDefecto(this.espacio.id, this.espacio.tipo);
    // Conserva los ids de los criterios que ya existen con el mismo nombre
    const actuales = this.config.value()?.criterios ?? [];
    this.modelo.set(aModelo({
      ...defecto,
      criterios: defecto.criterios.map((c) => ({ ...c, id: actuales.find((a) => a.nombre === c.nombre)?.id ?? 0 })),
    }));
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const m = this.modelo();
        await firstValueFrom(this.calificaciones.guardarConfig({
          id: this.espacio.id,
          notaMaxima: Number(m.notaMaxima),
          notaAprobacion: Number(m.notaAprobacion),
          criterios: m.criterios.map((c) => ({ ...c, porcentaje: Number(c.porcentaje) })),
        }));
        this.avisos.exito('Escala y ponderación guardadas.');
        this.config.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }
}
