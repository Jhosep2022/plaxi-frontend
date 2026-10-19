import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faChalkboardTeacher, faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { NIVELES, Paralelo, paraleloLabel } from '../../../../core/models/academico.model';
import { AcademicoService } from '../../../../services/academico.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { iconoMateria, mensajeError } from '../academico.ui';

// Carga horaria semanal de referencia para un docente a tiempo completo
const HORAS_COMPLETAS = 40;

@Component({
  selector: 'app-asignaciones',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './asignaciones.component.html',
  styleUrls: ['./asignaciones.component.css'],
})
export class AsignacionesComponent {
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  protected readonly session = inject(SessionService);
  private readonly espacioId = this.session.espacioActivo()!.id;

  readonly paraleloLabel = paraleloLabel;
  readonly iconoMateria = iconoMateria;
  readonly horasCompletas = HORAS_COMPLETAS;
  readonly faCheck = faCheck;
  readonly faCalendarDays = faCalendarDays;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faTriangleExclamation = faTriangleExclamation;

  readonly gestion = rxResource({ stream: () => this.academico.gestionActiva(this.espacioId) });
  readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });
  readonly materias = rxResource({ stream: () => this.academico.materias(this.espacioId), defaultValue: [] });
  readonly docentes = rxResource({ stream: () => this.academico.docentes(this.espacioId), defaultValue: [] });
  readonly asignaciones = rxResource({ stream: () => this.academico.asignacionesActivas(this.espacioId), defaultValue: [] });

  // Paralelo elegido: por defecto el primero; se mantiene la elección mientras exista
  readonly seleccionadoId = linkedSignal<Paralelo[], number>({
    source: () => this.paralelos.value(),
    computation: (lista, previo) => (previo && lista.some((p) => p.id === previo.value) ? previo.value : lista[0]?.id ?? 0),
  });

  readonly seleccionado = computed(() => this.paralelos.value().find((p) => p.id === this.seleccionadoId()) ?? null);
  readonly guardandoMateria = signal(0);

  // Paralelos agrupados por nivel, con su avance de asignación
  readonly grupos = computed(() => {
    const materiasPorNivel = new Map<string, number>();
    for (const m of this.materias.value()) materiasPorNivel.set(m.nivel, (materiasPorNivel.get(m.nivel) ?? 0) + 1);
    const asignadas = new Map<number, number>();
    for (const a of this.asignaciones.value()) asignadas.set(a.paraleloId, (asignadas.get(a.paraleloId) ?? 0) + 1);

    return NIVELES.map((n) => ({
      nivel: n.label,
      paralelos: this.paralelos.value()
        .filter((p) => p.nivel === n.id)
        .map((p) => ({ paralelo: p, asignadas: asignadas.get(p.id) ?? 0, total: materiasPorNivel.get(p.nivel) ?? 0 })),
    })).filter((g) => g.paralelos.length > 0);
  });

  // Materias del paralelo elegido con su docente actual
  readonly filas = computed(() => {
    const p = this.seleccionado();
    if (!p) return [];
    const docentePorMateria = new Map(
      this.asignaciones.value().filter((a) => a.paraleloId === p.id).map((a) => [a.materiaId, a.docenteId])
    );
    return this.materias.value()
      .filter((m) => m.nivel === p.nivel)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((m) => ({ materia: m, docenteId: docentePorMateria.get(m.id) ?? 0 }));
  });

  readonly resumen = computed(() => {
    const total = this.grupos().reduce((s, g) => s + g.paralelos.reduce((t, p) => t + p.total, 0), 0);
    return { asignadas: this.asignaciones.value().length, total };
  });

  // Horas semanales y paralelos de cada docente según sus asignaciones
  readonly carga = computed(() => {
    const horasMateria = new Map(this.materias.value().map((m) => [m.id, m.horasSemanales]));
    return this.docentes.value()
      .map((d) => {
        const propias = this.asignaciones.value().filter((a) => a.docenteId === d.id);
        return {
          docente: d,
          horas: propias.reduce((s, a) => s + (horasMateria.get(a.materiaId) ?? 0), 0),
          paralelos: new Set(propias.map((a) => a.paraleloId)).size,
        };
      })
      .sort((a, b) => b.horas - a.horas);
  });

  async asignar(materiaId: number, docenteId: number): Promise<void> {
    const p = this.seleccionado();
    const gestion = this.gestion.value();
    if (!p || !gestion) return;
    this.guardandoMateria.set(materiaId);
    try {
      await firstValueFrom(this.academico.asignar(this.espacioId, gestion.id, p.id, materiaId, docenteId));
      const docente = this.docentes.value().find((d) => d.id === docenteId);
      this.avisos.exito(docente ? `${docente.nombre} asignado a ${paraleloLabel(p)}.` : 'Docente quitado de la materia.');
      this.asignaciones.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardandoMateria.set(0);
    }
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase();
  }
}
