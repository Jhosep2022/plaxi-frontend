import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartLine, faCircleCheck, faFileCsv, faPrint, faTriangleExclamation, faUsers } from '@fortawesome/free-solid-svg-icons';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/auth/session.service';
import { todayIso } from '../../../core/utils/attendance';
import { periodoDeFecha } from '../../../core/utils/grades';
import { downloadCsv } from '../../../core/utils/reports';
import { AcademicsService } from '../../../services/academics.service';
import { BarChartComponent, ColumnChartComponent, ChartItem } from '../../../shared/reports/charts.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { SELECT } from '../../../shared/ui/select.component';

const ANUAL = -1;

// GET /api/espacios/:slug/reportes/rendimiento: the server computes the final grade of every student
interface ReporteRendimiento {
  periodo: number | 'anual';
  provisional: boolean;
  notaMaxima: number;
  notaAprobacion: number;
  resumen: { promedio: number | null; aprobacion: number; enRiesgo: number; evaluados: number };
  porCurso: { paraleloId: number; curso: string; promedio: number | null; aprobacion: number }[];
  distribucion: { desde: number; hasta: number; cantidad: number; bajoAprobacion: boolean }[];
  materiasCriticas: { curso: string; materia: string; docente: string; promedio: number | null; reprobados: number; total: number }[];
  enRiesgo: { estudianteId: number; nombre: string; curso: string; promedio: number | null; reprobadas: { materia: string; nota: number }[] }[];
}

// Reporte de rendimiento académico: promedios por curso, distribución de notas, materias críticas y estudiantes en riesgo
@Component({
  selector: 'app-academic-performance-report',
  host: { class: 'ui-pagina' },
  imports: [...SELECT, FaIconComponent, PageHeaderComponent, EmptyStateComponent, BarChartComponent, ColumnChartComponent],
  templateUrl: './academic-performance.component.html',
  styleUrls: ['./reports.css'],
})
export class AcademicPerformanceComponent {
  private academico = inject(AcademicsService);
  private http = inject(HttpClient);
  private session = inject(SessionService);
  private readonly espacioId = this.session.activeSpace()!.id;

  readonly ANUAL = ANUAL;
  readonly faChartLine = faChartLine;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileCsv = faFileCsv;
  readonly faPrint = faPrint;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faUsers = faUsers;

  private readonly anio = rxResource({ stream: () => this.academico.getActiveAcademicYear(this.espacioId) });
  readonly gestion = computed(() => this.anio.value() ?? undefined);
  readonly periodo = linkedSignal(() => {
    const g = this.gestion();
    return g ? periodoDeFecha(g, todayIso()) : 0;
  });

  readonly datos = rxResource({
    params: () => (this.gestion() ? this.periodo() : null),
    stream: ({ params }) => {
      if (params === null) return of(null);
      const url = `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}/reportes/rendimiento`;
      return this.http.get<ReporteRendimiento>(url, { params: { periodo: params === ANUAL ? 'anual' : params } });
    },
  });

  readonly config = computed(() => {
    const r = this.datos.value();
    return r ? { notaMaxima: r.notaMaxima, notaAprobacion: r.notaAprobacion } : undefined;
  });
  readonly provisional = computed(() => !!this.datos.value()?.provisional);
  // Anything to show (the empty state checks it)
  readonly notas = computed(() => (this.datos.value()?.resumen.evaluados ? [1] : []));

  readonly resumen = computed(() => {
    const r = this.datos.value()?.resumen;
    return { promedio: r?.promedio ?? null, aprobacion: r?.aprobacion ?? 0, enRiesgo: r?.enRiesgo ?? 0, evaluados: r?.evaluados ?? 0 };
  });

  readonly porCurso = computed<ChartItem[]>(() =>
    (this.datos.value()?.porCurso ?? []).map((c) => ({ etiqueta: c.curso, valor: c.promedio ?? 0, detalle: `${c.aprobacion}% de notas aprobadas`, alerta: c.aprobacion < 90 })),
  );

  // Grades by range (ranges below the passing grade in a warning tone)
  readonly distribucion = computed<ChartItem[]>(() =>
    (this.datos.value()?.distribucion ?? []).map((r) => ({ etiqueta: `${r.desde}–${r.hasta}`, valor: r.cantidad, alerta: r.bajoAprobacion })),
  );

  // Subjects (per class group) with failing students
  readonly materiasCriticas = computed(() => (this.datos.value()?.materiasCriticas ?? []).map((m) => ({ ...m, promedio: m.promedio ?? 0 })));

  // Students with at least one failed subject
  readonly enRiesgo = computed(() =>
    (this.datos.value()?.enRiesgo ?? []).map((e) => ({ estudiante: e.nombre, curso: e.curso, reprobadas: e.reprobadas, promedio: e.promedio ?? 0 })),
  );

  nombrePeriodo(): string {
    return this.periodo() === ANUAL ? 'Promedio anual' : this.gestion()?.periodos[this.periodo()]?.nombre ?? '';
  }

  exportarMaterias(): void {
    downloadCsv(`materias-con-reprobados-${this.nombrePeriodo()}`, ['Curso', 'Materia', 'Docente', 'Promedio', 'Reprobados', 'Estudiantes'],
      this.materiasCriticas().map((m) => [m.curso, m.materia, m.docente, m.promedio, m.reprobados, m.total]));
  }

  exportarRiesgo(): void {
    downloadCsv(`estudiantes-en-riesgo-${this.nombrePeriodo()}`, ['Estudiante', 'Curso', 'Materias reprobadas', 'Detalle', 'Promedio'],
      this.enRiesgo().map((e) => [e.estudiante, e.curso, e.reprobadas.length, e.reprobadas.map((r) => `${r.materia} (${r.nota})`).join(', '), e.promedio]));
  }

  imprimir(): void {
    window.print();
  }
}
