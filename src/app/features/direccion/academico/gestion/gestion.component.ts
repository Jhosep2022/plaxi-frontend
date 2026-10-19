import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, applyEach, form, max, min, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faCheck, faPen, faPlus, faTrash, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { EstadoGestion, Gestion, Periodo, TIPOS_PERIODO, TipoPeriodo } from '../../../../core/models/academico.model';
import { AcademicoService } from '../../../../services/academico.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { mensajeError } from '../academico.ui';

const DIA = 24 * 60 * 60 * 1000;
const aFecha = (texto: string) => new Date(`${texto}T00:00:00`);
const aTexto = (fecha: Date) => fecha.toISOString().slice(0, 10);

// Reparte el año escolar (2 feb – 4 dic) en periodos de igual duración
function generarPeriodos(anio: number, tipo: TipoPeriodo): Periodo[] {
  const config = TIPOS_PERIODO.find((t) => t.id === tipo)!;
  const inicio = aFecha(`${anio}-02-02`).getTime();
  const fin = aFecha(`${anio}-12-04`).getTime();
  const tramo = (fin - inicio) / config.cantidad;
  return Array.from({ length: config.cantidad }, (_, i) => ({
    nombre: config.nombre(i + 1),
    inicio: aTexto(new Date(inicio + tramo * i + (i ? DIA : 0))),
    fin: aTexto(new Date(i === config.cantidad - 1 ? fin : inicio + tramo * (i + 1))),
  }));
}

type EstadoPeriodo = 'concluido' | 'en-curso' | 'proximo';

@Component({
  selector: 'app-gestion',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './gestion.component.html',
  styleUrls: ['./gestion.component.css'],
})
export class GestionComponent {
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly tiposPeriodo = TIPOS_PERIODO;
  readonly faPlus = faPlus;
  readonly faPen = faPen;
  readonly faTrash = faTrash;
  readonly faCheck = faCheck;
  readonly faCalendarDays = faCalendarDays;
  readonly faWandMagicSparkles = faWandMagicSparkles;

  readonly gestiones = rxResource({ stream: () => this.academico.gestiones(this.espacioId), defaultValue: [] });
  readonly activa = computed(() => this.gestiones.value().find((g) => g.estado === 'activa') ?? null);
  readonly otras = computed(() => this.gestiones.value().filter((g) => g.estado !== 'activa'));

  // Periodos de la gestión activa con su estado según la fecha de hoy
  readonly lineaDeTiempo = computed(() => {
    const hoy = new Date().setHours(0, 0, 0, 0);
    return (this.activa()?.periodos ?? []).map((p) => {
      const inicio = aFecha(p.inicio).getTime();
      const fin = aFecha(p.fin).getTime();
      const estado: EstadoPeriodo = hoy > fin ? 'concluido' : hoy < inicio ? 'proximo' : 'en-curso';
      const avance = estado === 'concluido' ? 100 : estado === 'proximo' ? 0 : Math.round(((hoy - inicio) / (fin - inicio)) * 100);
      return { ...p, estado, avance, restantes: Math.max(0, Math.round((fin - hoy) / DIA)) };
    });
  });

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editando = signal<Gestion | null>(null);
  readonly guardando = signal(false);
  readonly modelo = signal({ anio: new Date().getFullYear() + 1, tipoPeriodo: 'trimestre' as TipoPeriodo, periodos: [] as Periodo[] });
  readonly formulario = form(this.modelo, (s) => {
    min(s.anio, 2000, { message: 'Año no válido.' });
    max(s.anio, 2100, { message: 'Año no válido.' });
    applyEach(s.periodos, (p) => {
      required(p.nombre, { message: 'Nombre requerido.' });
      required(p.inicio, { message: 'Fecha requerida.' });
      required(p.fin, { message: 'Fecha requerida.' });
      validate(p.fin, ({ value, valueOf }) =>
        value() && valueOf(p.inicio) && value() <= valueOf(p.inicio)
          ? { kind: 'orden', message: 'Debe terminar después de iniciar.' }
          : undefined
      );
    });
  });

  nuevo(): void {
    const anio = Math.max(new Date().getFullYear(), ...this.gestiones.value().map((g) => g.anio + 1));
    this.abrir(null, { anio, tipoPeriodo: 'trimestre', periodos: generarPeriodos(anio, 'trimestre') });
  }

  editar(g: Gestion): void {
    this.abrir(g, { anio: g.anio, tipoPeriodo: g.tipoPeriodo, periodos: structuredClone(g.periodos) });
  }

  // Vuelve a repartir las fechas según el año y la modalidad elegidos
  // (recibe la modalidad desde el evento: el modelo puede no estar actualizado todavía)
  repartirFechas(tipo?: TipoPeriodo): void {
    const tipoPeriodo = tipo ?? this.modelo().tipoPeriodo;
    this.modelo.update((m) => ({ ...m, tipoPeriodo, periodos: generarPeriodos(m.anio, tipoPeriodo) }));
  }

  guardar(): void {
    submit(this.formulario, async () => {
      const { anio, tipoPeriodo, periodos } = this.modelo();
      const solapado = periodos.findIndex((p, i) => i > 0 && p.inicio <= periodos[i - 1].fin);
      if (solapado > 0) {
        this.avisos.error(`${periodos[solapado].nombre} empieza antes de que termine ${periodos[solapado - 1].nombre}.`);
        return;
      }
      this.guardando.set(true);
      const editando = this.editando();
      try {
        await firstValueFrom(this.academico.guardarGestion({
          id: editando?.id,
          espacioId: this.espacioId,
          anio,
          tipoPeriodo,
          periodos,
          estado: editando?.estado ?? (this.activa() ? 'planificada' : 'activa'),
        }));
        this.avisos.exito(editando ? `Gestión ${anio} actualizada.` : `Gestión ${anio} creada.`);
        this.drawerAbierto.set(false);
        this.gestiones.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async activar(g: Gestion): Promise<void> {
    const actual = this.activa();
    const aviso = actual ? ` La gestión ${actual.anio} quedará cerrada.` : '';
    if (!confirm(`¿Activar la gestión ${g.anio}?${aviso}`)) return;
    try {
      await firstValueFrom(this.academico.activarGestion(g));
      this.avisos.exito(`Gestión ${g.anio} activada.`);
      this.gestiones.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  async eliminar(g: Gestion): Promise<void> {
    if (!confirm(`¿Eliminar la gestión ${g.anio}?`)) return;
    try {
      await firstValueFrom(this.academico.eliminarGestion(g));
      this.avisos.exito(`Gestión ${g.anio} eliminada.`);
      this.gestiones.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  tipoLabel(tipo: TipoPeriodo): string {
    return TIPOS_PERIODO.find((t) => t.id === tipo)?.label ?? tipo;
  }

  estadoLabel(estado: EstadoGestion): string {
    return { planificada: 'Planificada', activa: 'Activa', cerrada: 'Cerrada' }[estado];
  }

  fecha(texto: string): string {
    return aFecha(texto).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  private abrir(gestion: Gestion | null, valores: { anio: number; tipoPeriodo: TipoPeriodo; periodos: Periodo[] }): void {
    this.editando.set(gestion);
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
