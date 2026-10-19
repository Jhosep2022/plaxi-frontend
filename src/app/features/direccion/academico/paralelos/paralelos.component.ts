import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, max, min, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faDoorOpen, faPen, faPlus, faSitemap, faTrash, faTriangleExclamation, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { NIVELES, Nivel, Paralelo, TURNOS, Turno, gradoLabel, paraleloLabel } from '../../../../core/models/academico.model';
import { AcademicoService } from '../../../../services/academico.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { mensajeError } from '../academico.ui';

// En el formulario los selects trabajan con texto; se convierten a número al guardar
const PARALELO_VACIO = { nivel: 'secundaria' as Nivel, grado: '1', letra: 'A', turno: 'manana' as Turno, aulaId: '0', capacidad: 30 };

@Component({
  selector: 'app-paralelos',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, RouterLink, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './paralelos.component.html',
  styleUrls: ['./paralelos.component.css'],
})
export class ParalelosComponent {
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  protected readonly session = inject(SessionService);
  private readonly espacioId = this.session.espacioActivo()!.id;

  readonly niveles = NIVELES;
  readonly turnos = TURNOS;
  readonly gradoLabel = gradoLabel;
  readonly paraleloLabel = paraleloLabel;
  readonly faPlus = faPlus;
  readonly faPen = faPen;
  readonly faTrash = faTrash;
  readonly faUsers = faUsers;
  readonly faDoorOpen = faDoorOpen;
  readonly faSitemap = faSitemap;
  readonly faCalendarDays = faCalendarDays;
  readonly faTriangleExclamation = faTriangleExclamation;

  readonly gestion = rxResource({ stream: () => this.academico.gestionActiva(this.espacioId) });
  readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  readonly aulas = rxResource({ stream: () => this.academico.aulas(this.espacioId), defaultValue: [] });
  private readonly materias = rxResource({ stream: () => this.academico.materias(this.espacioId), defaultValue: [] });
  private readonly asignaciones = rxResource({ stream: () => this.academico.asignacionesActivas(this.espacioId), defaultValue: [] });

  readonly nivel = signal<Nivel>('secundaria');

  readonly conteoPorNivel = computed(() => {
    const conteo: Partial<Record<Nivel, number>> = {};
    for (const p of this.paralelos.value()) conteo[p.nivel] = (conteo[p.nivel] ?? 0) + 1;
    return conteo;
  });

  // Paralelos del nivel agrupados por grado
  readonly grupos = computed(() => {
    const porGrado = new Map<number, Paralelo[]>();
    for (const p of this.paralelos.value().filter((p) => p.nivel === this.nivel())) {
      porGrado.set(p.grado, [...(porGrado.get(p.grado) ?? []), p]);
    }
    return [...porGrado.entries()].sort(([a], [b]) => a - b).map(([grado, paralelos]) => ({ grado, paralelos }));
  });

  readonly nombreAula = computed(() => new Map(this.aulas.value().map((a) => [a.id, a.nombre])));

  readonly materiasPorNivel = computed(() => {
    const conteo: Partial<Record<Nivel, number>> = {};
    for (const m of this.materias.value()) conteo[m.nivel] = (conteo[m.nivel] ?? 0) + 1;
    return conteo;
  });

  readonly asignadasPorParalelo = computed(() => {
    const conteo = new Map<number, number>();
    for (const a of this.asignaciones.value()) conteo.set(a.paraleloId, (conteo.get(a.paraleloId) ?? 0) + 1);
    return conteo;
  });

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editandoId = signal(0);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...PARALELO_VACIO });
  readonly formulario = form(this.modelo, (s) => {
    required(s.letra, { message: 'Escribe la letra del paralelo.' });
    pattern(s.letra, /^[A-Za-z]{1,2}$/, { message: 'Usa una o dos letras, por ejemplo A.' });
    min(s.capacidad, 1, { message: 'La capacidad debe ser al menos 1.' });
    max(s.capacidad, 60, { message: 'La capacidad máxima es 60.' });
  });

  readonly gradosDelNivel = computed(() => {
    const cantidad = NIVELES.find((n) => n.id === this.modelo().nivel)?.grados ?? 6;
    return Array.from({ length: cantidad }, (_, i) => i + 1);
  });

  readonly aulasDisponibles = computed(() => this.aulas.value().filter((a) => a.activa));

  // Otro paralelo que ya usa el aula elegida en el mismo turno
  readonly choqueDeAula = computed(() => {
    const { aulaId, turno } = this.modelo();
    if (aulaId === '0') return null;
    return this.paralelos.value().find((p) => p.aulaId === Number(aulaId) && p.turno === turno && p.id !== this.editandoId()) ?? null;
  });

  nuevo(): void {
    this.abrir(0, { ...PARALELO_VACIO, nivel: this.nivel() });
  }

  editar(p: Paralelo): void {
    this.abrir(p.id, { nivel: p.nivel, grado: String(p.grado), letra: p.letra, turno: p.turno, aulaId: String(p.aulaId), capacidad: p.capacidad });
  }

  // Si el grado elegido no existe en el nuevo nivel (ej. 6to en inicial), vuelve al primero
  // (recibe el nivel desde el evento: el modelo puede no estar actualizado todavía)
  ajustarGrado(nivel: Nivel): void {
    const grados = NIVELES.find((n) => n.id === nivel)?.grados ?? 6;
    if (Number(this.modelo().grado) > grados) this.modelo.update((m) => ({ ...m, nivel, grado: '1' }));
  }

  guardar(): void {
    const gestion = this.gestion.value();
    if (!gestion) return;
    submit(this.formulario, async () => {
      this.guardando.set(true);
      const m = this.modelo();
      const existente = this.paralelos.value().find((p) => p.id === this.editandoId());
      try {
        const guardado = await firstValueFrom(this.academico.guardarParalelo({
          id: this.editandoId() || undefined,
          espacioId: this.espacioId,
          gestionId: gestion.id,
          nivel: m.nivel,
          grado: Number(m.grado),
          letra: m.letra.toUpperCase(),
          turno: m.turno,
          aulaId: Number(m.aulaId),
          capacidad: m.capacidad,
          estudiantes: existente?.estudiantes ?? 0,
        }));
        this.avisos.exito(`Paralelo ${paraleloLabel(guardado)} ${this.editandoId() ? 'actualizado' : 'creado'}.`);
        this.drawerAbierto.set(false);
        this.nivel.set(guardado.nivel);
        this.paralelos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async eliminar(p: Paralelo): Promise<void> {
    if (!confirm(`¿Eliminar el paralelo ${paraleloLabel(p)}? También se quitarán sus asignaciones docentes.`)) return;
    try {
      await firstValueFrom(this.academico.eliminarParalelo(p));
      this.avisos.exito('Paralelo eliminado.');
      this.paralelos.reload();
      this.asignaciones.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  turnoLabel(turno: Turno): string {
    return TURNOS.find((t) => t.id === turno)?.label ?? turno;
  }

  private abrir(id: number, valores: typeof PARALELO_VACIO): void {
    this.editandoId.set(id);
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
