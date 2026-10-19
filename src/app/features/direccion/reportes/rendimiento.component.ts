import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartLine, faCircleCheck, faFileCsv, faPrint, faTriangleExclamation, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../../core/models/academico.model';
import { hoyIso } from '../../../core/utils/asistencia';
import { aprobado, boletinDe, indiceNotas, periodoDeFecha, promedio } from '../../../core/utils/calificaciones';
import { descargarCsv, porcentaje } from '../../../core/utils/reportes';
import { AcademicoService } from '../../../services/academico.service';
import { CalificacionesService, DatosParalelo } from '../../../services/calificaciones.service';
import { BarrasComponent, ColumnasComponent, ItemGrafico } from '../../../shared/reportes/graficos.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

const ANUAL = -1;

interface NotaFinal {
  datos: DatosParalelo;
  curso: string;
  materia: string;
  docente: string;
  estudianteId: number;
  estudiante: string;
  nota: number;
}

// Reporte de rendimiento académico: promedios por curso, distribución de notas, materias críticas y estudiantes en riesgo
@Component({
  selector: 'app-reporte-rendimiento',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, BarrasComponent, ColumnasComponent],
  templateUrl: './rendimiento.component.html',
  styleUrls: ['./reportes.css'],
})
export class RendimientoComponent {
  private academico = inject(AcademicoService);
  private calificaciones = inject(CalificacionesService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly ANUAL = ANUAL;
  readonly faChartLine = faChartLine;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileCsv = faFileCsv;
  readonly faPrint = faPrint;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faUsers = faUsers;

  // Notas de todos los paralelos de la gestión activa
  readonly datos = rxResource({
    stream: () =>
      this.academico.paralelosActivos(this.espacioId).pipe(
        switchMap((ps) => (ps.length ? forkJoin([...ps].sort(compararParalelos).map((p) => this.calificaciones.datosDeParalelo(this.espacioId, p.id))) : of([]))),
        map((lista) => lista.filter((d): d is DatosParalelo => !!d))
      ),
  });

  readonly gestion = computed(() => this.datos.value()?.[0]?.gestion);
  readonly config = computed(() => this.datos.value()?.[0]?.config);
  readonly periodo = linkedSignal(() => {
    const g = this.gestion();
    return g ? periodoDeFecha(g, hoyIso()) : 0;
  });
  readonly provisional = computed(() => {
    const d = this.datos.value()?.[0];
    if (!d) return false;
    const periodo = this.periodo();
    return periodo === ANUAL ? d.cierres.length < d.gestion.periodos.length : !d.cierres.some((c) => c.periodo === periodo);
  });

  // Nota final de cada estudiante en cada materia para el periodo elegido (o el promedio anual)
  readonly notas = computed<NotaFinal[]>(() => {
    const periodo = this.periodo();
    return (this.datos.value() ?? []).flatMap((d) => {
      const buscar = indiceNotas(d.notas);
      const curso = paraleloLabel(d.paralelo);
      return d.estudiantes.flatMap((e) =>
        boletinDe(d, buscar, e.id).flatMap((f) => {
          const nota = periodo === ANUAL ? f.anual : f.periodos[periodo];
          return nota === null ? [] : [{ datos: d, curso, materia: f.materia.nombre, docente: f.docente, estudianteId: e.id, estudiante: e.nombre, nota }];
        })
      );
    });
  });

  private aprueba(nota: number): boolean {
    const c = this.config();
    return !!c && aprobado(c, nota);
  }

  readonly resumen = computed(() => {
    const notas = this.notas();
    const enRiesgo = new Set(notas.filter((n) => !this.aprueba(n.nota)).map((n) => n.estudianteId));
    return {
      promedio: promedio(notas.map((n) => n.nota)),
      aprobacion: porcentaje(notas.filter((n) => this.aprueba(n.nota)).length, notas.length),
      enRiesgo: enRiesgo.size,
      evaluados: new Set(notas.map((n) => n.estudianteId)).size,
    };
  });

  readonly porCurso = computed<ItemGrafico[]>(() => {
    const grupos = new Map<string, number[]>();
    for (const n of this.notas()) grupos.set(n.curso, [...(grupos.get(n.curso) ?? []), n.nota]);
    return [...grupos.entries()].map(([curso, notas]) => {
      const aprobacion = porcentaje(notas.filter((n) => this.aprueba(n)).length, notas.length);
      return { etiqueta: curso, valor: promedio(notas) ?? 0, detalle: `${aprobacion}% de notas aprobadas`, alerta: aprobacion < 90 };
    });
  });

  // Distribución de notas por rangos (los rangos bajo la nota de aprobación van en tono de advertencia)
  readonly distribucion = computed<ItemGrafico[]>(() => {
    const c = this.config();
    if (!c) return [];
    const max = c.notaMaxima;
    const cortes = [0, 0.2, 0.4, c.notaAprobacion / max, 0.6, 0.7, 0.8, 0.9, 1.0001].map((x) => Math.round(x * max));
    const rangos = cortes.slice(0, -1).map((desde, i) => ({ desde, hasta: cortes[i + 1] - 1 })).filter((r) => r.hasta >= r.desde);
    rangos[rangos.length - 1].hasta = max;
    return rangos.map((r) => ({
      etiqueta: `${r.desde}–${r.hasta}`,
      valor: this.notas().filter((n) => n.nota >= r.desde && n.nota <= r.hasta).length,
      alerta: r.hasta < c.notaAprobacion,
    }));
  });

  // Materias (por curso) con estudiantes reprobados
  readonly materiasCriticas = computed(() => {
    const grupos = new Map<string, NotaFinal[]>();
    for (const n of this.notas()) grupos.set(`${n.curso}|${n.materia}`, [...(grupos.get(`${n.curso}|${n.materia}`) ?? []), n]);
    return [...grupos.values()]
      .map((ns) => ({ curso: ns[0].curso, materia: ns[0].materia, docente: ns[0].docente, promedio: promedio(ns.map((n) => n.nota))!, reprobados: ns.filter((n) => !this.aprueba(n.nota)).length, total: ns.length }))
      .filter((m) => m.reprobados > 0)
      .sort((a, b) => b.reprobados / b.total - a.reprobados / a.total || a.promedio - b.promedio);
  });

  // Estudiantes con al menos una materia reprobada
  readonly enRiesgo = computed(() => {
    const grupos = new Map<number, NotaFinal[]>();
    for (const n of this.notas()) grupos.set(n.estudianteId, [...(grupos.get(n.estudianteId) ?? []), n]);
    return [...grupos.values()]
      .map((ns) => ({ estudiante: ns[0].estudiante, curso: ns[0].curso, reprobadas: ns.filter((n) => !this.aprueba(n.nota)), promedio: promedio(ns.map((n) => n.nota))! }))
      .filter((e) => e.reprobadas.length)
      .sort((a, b) => b.reprobadas.length - a.reprobadas.length || a.promedio - b.promedio);
  });

  nombrePeriodo(): string {
    return this.periodo() === ANUAL ? 'Promedio anual' : this.gestion()?.periodos[this.periodo()]?.nombre ?? '';
  }

  exportarMaterias(): void {
    descargarCsv(`materias-con-reprobados-${this.nombrePeriodo()}`, ['Curso', 'Materia', 'Docente', 'Promedio', 'Reprobados', 'Estudiantes'],
      this.materiasCriticas().map((m) => [m.curso, m.materia, m.docente, m.promedio, m.reprobados, m.total]));
  }

  exportarRiesgo(): void {
    descargarCsv(`estudiantes-en-riesgo-${this.nombrePeriodo()}`, ['Estudiante', 'Curso', 'Materias reprobadas', 'Detalle', 'Promedio'],
      this.enRiesgo().map((e) => [e.estudiante, e.curso, e.reprobadas.length, e.reprobadas.map((r) => `${r.materia} (${r.nota})`).join(', '), e.promedio]));
  }

  imprimir(): void {
    window.print();
  }
}
