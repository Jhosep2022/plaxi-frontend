import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faClock, faPaperclip, faStar, faTasks } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { iniciales } from '../../../core/models/personas.model';
import { ESTADO_ENTREGA } from '../../../core/models/tareas.model';
import { fechaCorta, fechaLarga } from '../../../core/utils/asistencia';
import { venceLabel } from '../../../core/utils/tareas';
import { FilaEntrega, RevisionEntrega, TareasService } from '../../../services/tareas.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { iconoMateria } from '../../../shared/ui/iconos-academicos';
import { mensajeError } from '../../direccion/academico/academico.ui';

interface Edicion {
  nota: string;
  comentario: string;
  revisada: boolean;
}

type Filtro = 'todos' | 'por-revisar' | 'sin-entregar';

// Revisión de una tarea: entregas de cada estudiante, nota (si cuenta para la planilla) y comentario
@Component({
  selector: 'app-detalle-tarea',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent],
  templateUrl: './detalle-tarea.component.html',
  styleUrls: ['./detalle-tarea.component.css'],
})
export class DetalleTareaComponent {
  private session = inject(SessionService);
  private servicio = inject(TareasService);
  private avisos = inject(AvisosService);

  readonly tareaId = input.required<string>();

  readonly estados = ESTADO_ENTREGA;
  readonly iniciales = iniciales;
  readonly iconoMateria = iconoMateria;
  readonly venceLabel = venceLabel;
  readonly fechaLarga = fechaLarga;
  readonly faArrowLeft = faArrowLeft;
  readonly faClock = faClock;
  readonly faPaperclip = faPaperclip;
  readonly faStar = faStar;
  readonly faTasks = faTasks;

  readonly datos = rxResource({ params: () => Number(this.tareaId()), stream: ({ params }) => this.servicio.detalle(params) });
  readonly tarea = computed(() => this.datos.value()?.tarea ?? null);
  readonly conNota = computed(() => !!this.tarea()?.actividadId);
  readonly cerrado = computed(() => !!this.datos.value()?.cerrado);

  // Valores editables de cada fila (se reinician al recargar)
  readonly ediciones = linkedSignal<Map<number, Edicion>>(() =>
    new Map((this.datos.value()?.filas ?? []).map((f) => [f.estudiante.id, this.original(f)]))
  );

  readonly filtro = signal<Filtro>('todos');
  readonly conteo = computed(() => {
    const filas = this.datos.value()?.filas ?? [];
    return {
      total: filas.length,
      entregadas: filas.filter((f) => f.entrega?.entregadaEl).length,
      tarde: filas.filter((f) => f.estado === 'tarde').length,
      porRevisar: filas.filter((f) => f.estado === 'entregada' || f.estado === 'tarde').length,
      sinEntregar: filas.filter((f) => !f.entrega?.entregadaEl).length,
      revisadas: filas.filter((f) => f.estado === 'revisada').length,
    };
  });
  readonly filas = computed(() => {
    const filas = this.datos.value()?.filas ?? [];
    if (this.filtro() === 'por-revisar') return filas.filter((f) => f.estado === 'entregada' || f.estado === 'tarde');
    if (this.filtro() === 'sin-entregar') return filas.filter((f) => !f.entrega?.entregadaEl);
    return filas;
  });

  ruta(...segmentos: (string | number)[]) {
    return this.session.rutaRol(...segmentos);
  }

  edicion(id: number): Edicion {
    return this.ediciones().get(id) ?? { nota: '', comentario: '', revisada: false };
  }

  cambiar(id: number, cambio: Partial<Edicion>): void {
    this.ediciones.update((m) => {
      const actual = this.edicion(id);
      const siguiente = { ...actual, ...cambio };
      // Poner nota o comentario marca la entrega como revisada
      if (cambio.nota !== undefined && cambio.nota !== '') siguiente.revisada = true;
      if (cambio.comentario !== undefined && cambio.comentario.trim()) siguiente.revisada = true;
      return new Map(m).set(id, siguiente);
    });
  }

  notaInvalida(texto: string): boolean {
    if (texto === '') return false;
    const n = Number(texto);
    return !Number.isFinite(n) || n < 0 || n > (this.tarea()?.notaMaxima ?? 100);
  }

  readonly cambios = computed<RevisionEntrega[]>(() => {
    const filas = this.datos.value()?.filas ?? [];
    return filas.flatMap((f) => {
      const e = this.edicion(f.estudiante.id);
      const o = this.original(f);
      if (e.nota === o.nota && e.comentario === o.comentario && e.revisada === o.revisada) return [];
      if (!e.revisada) return [];
      return [{ estudianteId: f.estudiante.id, nota: e.nota === '' ? null : Number(e.nota), comentario: e.comentario }];
    });
  });
  readonly hayErrores = computed(() => [...this.ediciones().values()].some((e) => this.notaInvalida(e.nota)));
  readonly guardando = signal(false);

  async guardar(): Promise<void> {
    if (this.hayErrores() || !this.cambios().length) return;
    this.guardando.set(true);
    try {
      const n = await firstValueFrom(this.servicio.revisar(this.session.espacioActivo()!.id, Number(this.tareaId()), this.cambios()));
      this.avisos.exito(`${n} ${n === 1 ? 'entrega revisada' : 'entregas revisadas'}${this.conNota() ? ' y notas guardadas en la planilla' : ''}.`);
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  entregadaLabel(f: FilaEntrega): string {
    const iso = f.entrega?.entregadaEl;
    return iso ? `${fechaCorta(iso.slice(0, 10))}, ${iso.slice(11, 16)}` : '';
  }

  private original(f: FilaEntrega): Edicion {
    return { nota: f.nota?.toString() ?? '', comentario: f.entrega?.comentario ?? '', revisada: !!f.entrega?.revisada };
  }
}
