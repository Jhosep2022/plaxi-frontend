import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBook, faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { IconoMateria, Materia, NIVELES, Nivel } from '../../../../core/models/academico.model';
import { Tono } from '../../../../shared/dashboard/dashboard.models';
import { AcademicoService } from '../../../../services/academico.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { ICONOS_MATERIA, iconoMateria, mensajeError } from '../academico.ui';

const TONOS: { id: Tono; label: string }[] = [
  { id: 'lima', label: 'Lima' },
  { id: 'azul', label: 'Azul' },
  { id: 'crema', label: 'Crema' },
];

const MATERIA_VACIA = { nombre: '', nivel: 'secundaria' as Nivel, horasSemanales: 4, icono: 'libro' as IconoMateria, tono: 'lima' as Tono };

@Component({
  selector: 'app-materias',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './materias.component.html',
  styleUrls: ['./materias.component.css'],
})
export class MateriasComponent {
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly niveles = NIVELES;
  readonly iconos = ICONOS_MATERIA;
  readonly tonos = TONOS;
  readonly iconoMateria = iconoMateria;
  readonly faPlus = faPlus;
  readonly faPen = faPen;
  readonly faTrash = faTrash;
  readonly faBook = faBook;

  readonly materias = rxResource({ stream: () => this.academico.materias(this.espacioId), defaultValue: [] });
  private readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  private readonly asignaciones = rxResource({ stream: () => this.academico.asignacionesActivas(this.espacioId), defaultValue: [] });

  readonly nivel = signal<Nivel>('secundaria');

  readonly materiasDelNivel = computed(() =>
    this.materias.value().filter((m) => m.nivel === this.nivel()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  );

  readonly conteoPorNivel = computed(() => {
    const conteo: Partial<Record<Nivel, number>> = {};
    for (const m of this.materias.value()) conteo[m.nivel] = (conteo[m.nivel] ?? 0) + 1;
    return conteo;
  });

  readonly horasDelNivel = computed(() => this.materiasDelNivel().reduce((s, m) => s + m.horasSemanales, 0));

  // Cuántos paralelos del nivel ya tienen docente para cada materia
  readonly cobertura = computed(() => {
    const paralelos = this.paralelos.value().filter((p) => p.nivel === this.nivel());
    const asignadas = new Map<number, number>();
    for (const a of this.asignaciones.value()) asignadas.set(a.materiaId, (asignadas.get(a.materiaId) ?? 0) + 1);
    return { total: paralelos.length, porMateria: asignadas };
  });

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editandoId = signal(0);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...MATERIA_VACIA });
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Escribe el nombre de la materia.' });
    maxLength(s.nombre, 60, { message: 'Máximo 60 caracteres.' });
    min(s.horasSemanales, 1, { message: 'Debe tener al menos 1 hora semanal.' });
    max(s.horasSemanales, 20, { message: 'Máximo 20 horas semanales.' });
  });

  nuevo(): void {
    this.abrir(0, { ...MATERIA_VACIA, nivel: this.nivel() });
  }

  editar(materia: Materia): void {
    const { nombre, nivel, horasSemanales, icono, tono } = materia;
    this.abrir(materia.id, { nombre, nivel, horasSemanales, icono, tono });
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const guardada = await firstValueFrom(
          this.academico.guardarMateria({ ...this.modelo(), id: this.editandoId() || undefined, espacioId: this.espacioId })
        );
        this.avisos.exito(this.editandoId() ? 'Materia actualizada.' : 'Materia creada.');
        this.drawerAbierto.set(false);
        this.nivel.set(guardada.nivel);
        this.materias.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async eliminar(materia: Materia): Promise<void> {
    if (!confirm(`¿Eliminar la materia "${materia.nombre}"?`)) return;
    try {
      await firstValueFrom(this.academico.eliminarMateria(materia));
      this.avisos.exito('Materia eliminada.');
      this.materias.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  private abrir(id: number, valores: typeof MATERIA_VACIA): void {
    this.editandoId.set(id);
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
