import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faChevronRight, faClock, faFileMedical, faUserCheck, faUsers, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { ESTADO_DIA_LABEL, EstadoDia, RegistroAsistencia } from '../../../core/models/asistencia.model';
import { estadoDelDia, fechaLarga, hoyIso, sumarDias } from '../../../core/utils/asistencia';
import { AcademicoService } from '../../../services/academico.service';
import { AsistenciaService } from '../../../services/asistencia.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

type ConteoDia = Record<EstadoDia, number> & { total: number; porcentaje: number };

function contarDias(estados: EstadoDia[]): ConteoDia {
  const c: ConteoDia = { presente: 0, ausente: 0, atraso: 0, licencia: 0, parcial: 0, total: estados.length, porcentaje: 100 };
  for (const e of estados) c[e]++;
  const computables = c.total - c.licencia;
  // Asistieron (aunque sea con atraso o faltando a alguna clase) sobre los que debían asistir
  c.porcentaje = computables ? Math.round(((c.presente + c.atraso + c.parcial) / computables) * 100) : 100;
  return c;
}

// Resumen diario de asistencia de estudiantes para la dirección (calculado desde la asistencia por clase)
@Component({
  selector: 'app-asistencia-estudiantes',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './asistencia-estudiantes.component.html',
  styleUrls: ['./asistencia-estudiantes.component.css'],
})
export class AsistenciaEstudiantesComponent {
  protected readonly session = inject(SessionService);
  private asistencia = inject(AsistenciaService);
  private academico = inject(AcademicoService);

  readonly estadoDiaLabel = ESTADO_DIA_LABEL;
  readonly paraleloLabel = paraleloLabel;
  readonly fechaLarga = fechaLarga;
  readonly faCalendarDays = faCalendarDays;
  readonly faUserCheck = faUserCheck;
  readonly faUserXmark = faUserXmark;
  readonly faClock = faClock;
  readonly faFileMedical = faFileMedical;
  readonly faUsers = faUsers;
  readonly faChevronRight = faChevronRight;

  private readonly espacioId = this.session.espacioActivo()!.id;
  readonly hoy = hoyIso();

  // Últimas dos semanas para elegir por defecto el día más reciente con asistencia
  readonly base = rxResource({
    stream: () => forkJoin({
      registros: this.asistencia.registrosEntre(this.espacioId, sumarDias(this.hoy, -21), this.hoy),
      estudiantes: this.asistencia.estudiantes(),
      paralelos: this.academico.paralelosActivos(this.espacioId),
      licencias: this.asistencia.licencias(this.espacioId),
      materias: this.academico.materias(this.espacioId),
    }),
  });

  readonly fecha = linkedSignal(() => {
    const fechas = (this.base.value()?.registros ?? []).map((r) => r.fecha).sort();
    return fechas.at(-1) ?? this.hoy;
  });

  readonly pendientes = computed(() => (this.base.value()?.licencias ?? []).filter((l) => l.estado === 'pendiente').length);

  // Estado del día de cada estudiante que tuvo clases en la fecha elegida
  readonly resumen = computed(() => {
    const b = this.base.value();
    if (!b) return null;
    const delDia = b.registros.filter((r) => r.fecha === this.fecha());
    const porEstudiante = new Map<number, RegistroAsistencia[]>();
    for (const r of delDia) porEstudiante.set(r.estudianteId, [...(porEstudiante.get(r.estudianteId) ?? []), r]);
    const nombreMateria = new Map(b.materias.map((m) => [m.id, m.nombre]));

    const estudiantes = b.estudiantes
      .filter((e) => porEstudiante.has(e.id))
      .map((e) => {
        const registros = porEstudiante.get(e.id)!;
        return {
          estudiante: e,
          estado: estadoDelDia(registros)!,
          clases: registros.length,
          detalle: registros.filter((r) => r.estado !== 'presente').map((r) => `${nombreMateria.get(r.materiaId)}: ${r.estado === 'atraso' ? `${r.minutosTarde} min tarde` : r.estado}`),
        };
      });

    const paralelos = [...b.paralelos].sort(compararParalelos).map((p) => {
      const propios = estudiantes.filter((x) => x.estudiante.paraleloId === p.id);
      return { paralelo: p, conteo: contarDias(propios.map((x) => x.estado)), estudiantes: propios };
    });

    return { general: contarDias(estudiantes.map((x) => x.estado)), paralelos };
  });

  readonly paraleloId = linkedSignal(() => this.resumen()?.paralelos.find((p) => p.conteo.total > 0)?.paralelo.id ?? 0);
  readonly detalle = computed(() => this.resumen()?.paralelos.find((p) => p.paralelo.id === this.paraleloId()) ?? null);

  cambiarFecha(valor: string): void {
    if (valor && valor <= this.hoy) this.fecha.set(valor);
  }

  ordenEstado(estado: EstadoDia): number {
    return ['ausente', 'parcial', 'atraso', 'licencia', 'presente'].indexOf(estado);
  }

  ordenados<T extends { estado: EstadoDia; estudiante: { nombre: string } }>(lista: T[]): T[] {
    return [...lista].sort((a, b) => this.ordenEstado(a.estado) - this.ordenEstado(b.estado) || a.estudiante.nombre.localeCompare(b.estudiante.nombre));
  }
}
