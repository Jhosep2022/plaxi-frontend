import { Component, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, applyEach, form, max, min, submit, validate } from '@angular/forms/signals';
import { SessionService } from '../../../../core/auth/session.service';
import { TURNOS } from '../../../../core/models/academico.model';
import { HorarioLaboral } from '../../../../core/models/marcacion.model';
import { aMinutos } from '../../../../core/utils/jornada';
import { MarcacionService } from '../../../../services/marcacion.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { mensajeError } from '../../academico/academico.ui';

const aModelo = (h: HorarioLaboral | undefined) => ({
  toleranciaMin: h?.toleranciaMin ?? 10,
  turnos: TURNOS.map((t) => {
    const actual = h?.turnos.find((x) => x.turno === t.id);
    return { turno: t.id, entrada: actual?.entrada ?? '07:15', salida: actual?.salida ?? '14:00' };
  }),
});

// Horario de entrada y salida del personal por turno, y tolerancia de atraso
@Component({
  selector: 'app-horario-laboral',
  host: { class: 'ui-pagina' },
  imports: [FormField, PageHeaderComponent],
  styles: `
    .secciones { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
    h2 { margin: 0 0 4px; font-size: 17px; }
    .ui-ayuda { display: block; margin-bottom: 14px; }
    .tolerancia { width: 140px; }
    .turnos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .turno { padding: 14px; border: 1px solid var(--line); border-radius: 12px; }
    .turno h3 { margin: 0 0 10px; font-size: 15px; }
  `,
  template: `
    <app-page-header miga="Institución" titulo="Horario laboral" descripcion="A qué hora debe entrar y salir el personal en cada turno. Cada docente marca según el turno de su primera clase del día.">
      <button type="button" class="ui-btn" [disabled]="guardando()" (click)="guardar()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
    </app-page-header>

    <form class="secciones" (submit)="$event.preventDefault(); guardar()" novalidate>
      <section class="ui-card">
        <h2>Tolerancia de atraso</h2>
        <span class="ui-ayuda">Minutos después de la hora de entrada en los que la marcación todavía cuenta como "a tiempo".</span>
        <div class="ui-campo tolerancia">
          <label for="hl-tol">Minutos</label>
          <input id="hl-tol" type="number" class="ui-input" [formField]="formulario.toleranciaMin" />
        </div>
        @if (formulario.toleranciaMin().invalid()) {
          <span class="ui-error">{{ formulario.toleranciaMin().errors()[0].message }}</span>
        }
      </section>

      <section class="ui-card">
        <h2>Entrada y salida por turno</h2>
        <span class="ui-ayuda">Se usa el turno donde el docente tiene su primera clase de cada día.</span>
        <div class="turnos">
          @for (t of formulario.turnos; track $index) {
            <div class="turno">
              <h3>Turno {{ turnos[$index].label }}</h3>
              <div class="ui-fila">
                <div class="ui-campo">
                  <label [for]="'ent-' + $index">Entrada</label>
                  <input [id]="'ent-' + $index" type="time" class="ui-input" [formField]="t.entrada" />
                </div>
                <div class="ui-campo">
                  <label [for]="'sal-' + $index">Salida</label>
                  <input [id]="'sal-' + $index" type="time" class="ui-input" [formField]="t.salida" />
                </div>
              </div>
              @if (t.salida().invalid()) {
                <span class="ui-error">{{ t.salida().errors()[0].message }}</span>
              }
            </div>
          }
        </div>
      </section>
    </form>
  `,
})
export class HorarioLaboralComponent {
  private marcacion = inject(MarcacionService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly turnos = TURNOS;
  readonly horario = rxResource({ stream: () => this.marcacion.horarioLaboral(this.espacioId) });
  readonly modelo = linkedSignal(() => aModelo(this.horario.value()));
  readonly formulario = form(this.modelo, (s) => {
    min(s.toleranciaMin, 0, { message: 'La tolerancia no puede ser negativa.' });
    max(s.toleranciaMin, 60, { message: 'La tolerancia máxima es 60 minutos.' });
    applyEach(s.turnos, (t) => {
      validate(t.salida, ({ value, valueOf }) =>
        aMinutos(value()) <= aMinutos(valueOf(t.entrada)) ? { kind: 'orden', message: 'La salida debe ser posterior a la entrada.' } : undefined
      );
    });
  });
  readonly guardando = signal(false);

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        await firstValueFrom(this.marcacion.guardarHorarioLaboral({ id: this.espacioId, ...this.modelo() }));
        this.avisos.exito('Horario laboral guardado.');
        this.horario.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }
}
