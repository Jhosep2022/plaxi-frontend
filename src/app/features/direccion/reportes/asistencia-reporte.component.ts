import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClock, faFileCsv, faFileMedical, faPrint, faUserCheck, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { RegistroAsistencia } from '../../../core/models/asistencia.model';
import { contar, fechaCorta, hoyIso, sumarDias } from '../../../core/utils/asistencia';
import { descargarCsv } from '../../../core/utils/reportes';
import { AcademicoService } from '../../../services/academico.service';
import { AsistenciaService } from '../../../services/asistencia.service';
import { BarrasComponent, ColumnasComponent, ItemGrafico } from '../../../shared/reportes/graficos.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

const META = 90; // % de asistencia esperado; por debajo se marca en tono de advertencia

// Reporte de asistencia de estudiantes en un rango de fechas: por curso, por día y estudiantes con más faltas
@Component({
  selector: 'app-reporte-asistencia',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, BarrasComponent, ColumnasComponent],
  templateUrl: './asistencia-reporte.component.html',
  styleUrls: ['./reportes.css'],
})
export class AsistenciaReporteComponent {
  private academico = inject(AcademicoService);
  private asistencia = inject(AsistenciaService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly META = META;
  readonly faClock = faClock;
  readonly faFileCsv = faFileCsv;
  readonly faFileMedical = faFileMedical;
  readonly faPrint = faPrint;
  readonly faUserCheck = faUserCheck;
  readonly faUserXmark = faUserXmark;

  readonly hoy = hoyIso();
  readonly desde = signal(sumarDias(this.hoy, -14));
  readonly hasta = signal(this.hoy);

  readonly datos = rxResource({
    params: () => ({ desde: this.desde(), hasta: this.hasta() }),
    stream: ({ params }) =>
      forkJoin({
        registros: this.asistencia.registrosEntre(this.espacioId, params.desde, params.hasta),
        estudiantes: this.asistencia.estudiantes(),
        paralelos: this.academico.paralelosActivos(this.espacioId),
        materias: this.academico.materias(this.espacioId),
      }),
  });

  private readonly registros = computed(() => this.datos.value()?.registros ?? []);
  readonly general = computed(() => contar(this.registros()));
  readonly diasConClases = computed(() => new Set(this.registros().map((r) => r.fecha)).size);

  readonly porCurso = computed<ItemGrafico[]>(() => {
    const d = this.datos.value();
    if (!d) return [];
    return [...d.paralelos].sort(compararParalelos).flatMap((p) => {
      const c = contar(this.registros().filter((r) => r.paraleloId === p.id));
      return c.total ? [{ etiqueta: paraleloLabel(p), valor: c.porcentaje, texto: `${c.porcentaje}%`, detalle: `${c.ausente} faltas · ${c.atraso} atrasos`, alerta: c.porcentaje < META }] : [];
    });
  });

  readonly porDia = computed<ItemGrafico[]>(() => {
    const porFecha = new Map<string, RegistroAsistencia[]>();
    for (const r of this.registros()) porFecha.set(r.fecha, [...(porFecha.get(r.fecha) ?? []), r]);
    return [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, rs]) => {
      const c = contar(rs);
      return { etiqueta: fechaCorta(fecha).split(', ').at(-1)!, valor: c.porcentaje, texto: `${c.porcentaje}%`, alerta: c.porcentaje < META };
    });
  });

  readonly porMateria = computed<ItemGrafico[]>(() => {
    const d = this.datos.value();
    if (!d) return [];
    const nombres = new Map(d.materias.map((m) => [m.id, m.nombre]));
    const grupos = new Map<string, RegistroAsistencia[]>();
    for (const r of this.registros()) {
      const nombre = nombres.get(r.materiaId) ?? 'Materia';
      grupos.set(nombre, [...(grupos.get(nombre) ?? []), r]);
    }
    return [...grupos.entries()]
      .map(([materia, rs]) => {
        const c = contar(rs);
        return { etiqueta: materia, valor: c.porcentaje, texto: `${c.porcentaje}%`, detalle: `${c.total} registros`, alerta: c.porcentaje < META };
      })
      .sort((a, b) => a.valor - b.valor);
  });

  // Estudiantes con faltas o atrasos, de más a menos faltas
  readonly estudiantes = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    const cursos = new Map(d.paralelos.map((p) => [p.id, paraleloLabel(p)]));
    const porEstudiante = new Map<number, RegistroAsistencia[]>();
    for (const r of this.registros()) porEstudiante.set(r.estudianteId, [...(porEstudiante.get(r.estudianteId) ?? []), r]);
    return d.estudiantes
      .filter((e) => porEstudiante.has(e.id))
      .map((e) => ({ nombre: e.nombre, curso: cursos.get(e.paraleloId) ?? 'Sin curso', conteo: contar(porEstudiante.get(e.id)!) }))
      .filter((x) => x.conteo.ausente || x.conteo.atraso)
      .sort((a, b) => b.conteo.ausente - a.conteo.ausente || b.conteo.atraso - a.conteo.atraso || a.conteo.porcentaje - b.conteo.porcentaje);
  });

  readonly verTodos = signal(false);
  readonly estudiantesVisibles = computed(() => (this.verTodos() ? this.estudiantes() : this.estudiantes().slice(0, 15)));

  cambiarDesde(valor: string): void {
    if (valor && valor <= this.hasta()) this.desde.set(valor);
  }

  cambiarHasta(valor: string): void {
    if (valor && valor >= this.desde() && valor <= this.hoy) this.hasta.set(valor);
  }

  exportar(): void {
    descargarCsv(`asistencia-${this.desde()}-a-${this.hasta()}`, ['Estudiante', 'Curso', 'Clases', 'Faltas', 'Atrasos', 'Licencias', '% asistencia'],
      this.estudiantes().map((e) => [e.nombre, e.curso, e.conteo.total, e.conteo.ausente, e.conteo.atraso, e.conteo.licencia, e.conteo.porcentaje]));
  }

  imprimir(): void {
    window.print();
  }
}
