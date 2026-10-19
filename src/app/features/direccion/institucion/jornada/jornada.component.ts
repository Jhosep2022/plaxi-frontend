import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, applyEach, form, max, min, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClock, faMugHot, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { ConfigJornada, DIAS_SEMANA, TURNOS, Turno } from '../../../../core/models/academico.model';
import { aMinutos, duracionLabel, generarBloques } from '../../../../core/utils/jornada';
import { HorariosService } from '../../../../services/horarios.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { mensajeError } from '../../academico/academico.ui';

const DURACIONES_RAPIDAS = [40, 45, 60, 90];
const TURNO_POR_DEFECTO: Record<Turno, { inicio: string; fin: string; recreo: string }> = {
  manana: { inicio: '07:30', fin: '14:00', recreo: '10:30' },
  tarde: { inicio: '14:30', fin: '21:00', recreo: '17:30' },
  noche: { inicio: '18:30', fin: '22:30', recreo: '20:00' },
};

// Modelo del formulario: los días como 7 casillas (lunes a domingo)
function aModelo(j: ConfigJornada | undefined) {
  return {
    duracionPeriodoMin: j?.duracionPeriodoMin ?? 90,
    dias: DIAS_SEMANA.map((d) => (j ? j.dias.includes(d.id) : d.id <= 5)),
    turnos: TURNOS.map(({ id }) => {
      const t = j?.turnos.find((x) => x.turno === id);
      const def = TURNO_POR_DEFECTO[id];
      return {
        turno: id,
        activo: t?.activo ?? id === 'manana',
        inicio: t?.inicio ?? def.inicio,
        fin: t?.fin ?? def.fin,
        recreos: structuredClone(t?.recreos ?? [{ inicio: def.recreo, duracionMin: 20 }]),
      };
    }),
  };
}

@Component({
  selector: 'app-jornada',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent],
  templateUrl: './jornada.component.html',
  styleUrls: ['./jornada.component.css'],
})
export class JornadaComponent {
  private horarios = inject(HorariosService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly diasSemana = DIAS_SEMANA;
  readonly duracionesRapidas = DURACIONES_RAPIDAS;
  readonly duracionLabel = duracionLabel;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faClock = faClock;
  readonly faMugHot = faMugHot;

  readonly jornada = rxResource({ stream: () => this.horarios.jornada(this.espacioId) });

  // El formulario parte de la jornada guardada y se puede editar libremente
  readonly modelo = linkedSignal(() => aModelo(this.jornada.value()));
  readonly formulario = form(this.modelo, (s) => {
    min(s.duracionPeriodoMin, 20, { message: 'El periodo debe durar al menos 20 minutos.' });
    max(s.duracionPeriodoMin, 240, { message: 'El periodo puede durar como máximo 4 horas.' });
    validate(s.dias, ({ value }) => (value().some(Boolean) ? undefined : { kind: 'dias', message: 'Elige al menos un día de clases.' }));
    validate(s.turnos, ({ value }) => (value().some((t) => t.activo) ? undefined : { kind: 'turnos', message: 'Activa al menos un turno.' }));
    applyEach(s.turnos, (t) => {
      validate(t.fin, ({ value, valueOf }) =>
        valueOf(t.activo) && aMinutos(value()) <= aMinutos(valueOf(t.inicio))
          ? { kind: 'orden', message: 'La hora de fin debe ser posterior a la de inicio.' }
          : undefined
      );
      applyEach(t.recreos, (r) => {
        min(r.duracionMin, 5, { message: 'Mínimo 5 minutos.' });
        max(r.duracionMin, 90, { message: 'Máximo 90 minutos.' });
      });
    });
  });

  readonly guardando = signal(false);

  // Vista previa: periodos y recreos que resultan en cada turno
  readonly previa = computed(() => {
    const { duracionPeriodoMin, turnos, dias } = this.modelo();
    const diasActivos = dias.filter(Boolean).length;
    return turnos.map((t) => {
      const bloques = t.activo ? generarBloques(t, duracionPeriodoMin) : [];
      const periodos = bloques.filter((b) => b.tipo === 'clase').length;
      return { bloques, periodos, porSemana: periodos * diasActivos, horasSemana: (periodos * diasActivos * duracionPeriodoMin) / 60 };
    });
  });

  readonly sinCambios = computed(() => JSON.stringify(this.modelo()) === JSON.stringify(aModelo(this.jornada.value())));

  turnoLabel(turno: Turno): string {
    return TURNOS.find((t) => t.id === turno)?.label ?? turno;
  }

  usarDuracion(minutos: number): void {
    this.modelo.update((m) => ({ ...m, duracionPeriodoMin: minutos }));
  }

  agregarRecreo(indiceTurno: number): void {
    this.modelo.update((m) => {
      const turnos = structuredClone(m.turnos);
      const ultimo = turnos[indiceTurno].recreos.at(-1);
      turnos[indiceTurno].recreos.push({ inicio: ultimo ? ultimo.inicio : turnos[indiceTurno].inicio, duracionMin: 15 });
      return { ...m, turnos };
    });
  }

  quitarRecreo(indiceTurno: number, indiceRecreo: number): void {
    this.modelo.update((m) => {
      const turnos = structuredClone(m.turnos);
      turnos[indiceTurno].recreos.splice(indiceRecreo, 1);
      return { ...m, turnos };
    });
  }

  descartar(): void {
    this.modelo.set(aModelo(this.jornada.value()));
    this.formulario().reset();
  }

  guardar(): void {
    submit(this.formulario, async () => {
      const m = this.modelo();
      const config: ConfigJornada = {
        espacioId: this.espacioId,
        duracionPeriodoMin: m.duracionPeriodoMin,
        dias: DIAS_SEMANA.filter((_, i) => m.dias[i]).map((d) => d.id),
        turnos: m.turnos.map((t) => ({ ...t, recreos: [...t.recreos].sort((a, b) => aMinutos(a.inicio) - aMinutos(b.inicio)) })),
      };
      const afectadas = this.horarios.clasesAfectadas(config);
      if (afectadas && !confirm(`Con esta jornada, ${afectadas} clase(s) del horario quedan fuera (día o periodo que ya no existe) y se quitarán. ¿Continuar?`)) {
        return;
      }
      this.guardando.set(true);
      try {
        const { quitadas } = await firstValueFrom(this.horarios.guardarJornada(config));
        this.avisos.exito(quitadas ? `Jornada guardada. Se quitaron ${quitadas} clase(s) del horario.` : 'Jornada guardada.');
        this.jornada.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }
}
