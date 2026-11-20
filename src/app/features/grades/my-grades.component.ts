import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookOpen, faChartLine, faCircleCheck, faFileLines, faLock, faStar } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { formatShortDate, todayIso } from '../../core/utils/attendance';
import { periodoDeFecha, promedio } from '../../core/utils/grades';
import { AcademicsService } from '../../services/academics.service';
import { GradesApiService } from '../../services/grades-api.service';
import { SelectedChildService } from '../../services/selected-child.service';
import { ChildSelectorComponent } from '../../shared/ui/child-selector.component';
import { ReportCardComponent } from '../../shared/grades/report-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { subjectIcon } from '../../shared/ui/academic-icons';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AcademyStudentGradesComponent } from '../academy/academy-grades.component';

const BOLETIN = -1; // pestaña del boletín

// "Mis calificaciones" del estudiante y "Calificaciones" del padre (sobre su hijo):
// notas por materia y periodo, con el detalle de cada actividad, y el boletín.
@Component({
  selector: 'app-my-grades',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, ReportCardComponent, ChildSelectorComponent, AcademyStudentGradesComponent],
  templateUrl: './my-grades.component.html',
  styleUrls: ['./my-grades.component.css'],
})
export class MyGradesComponent {
  private session = inject(SessionService);
  private academico = inject(AcademicsService);
  private calificaciones = inject(GradesApiService);
  private hijoActivo = inject(SelectedChildService);

  readonly BOLETIN = BOLETIN;
  readonly faStar = faStar;
  readonly faLock = faLock;
  readonly faFileLines = faFileLines;
  readonly faChartLine = faChartLine;
  readonly faCircleCheck = faCircleCheck;
  readonly faBookOpen = faBookOpen;
  readonly subjectIcon = subjectIcon;
  readonly formatShortDate = formatShortDate;

  readonly espacio = this.session.activeSpace()!;
  readonly esPadre = this.session.activeRole() === 'padre';

  // The student (oneself, or the parent's chosen child) and their grades, computed by the API
  readonly vista = rxResource({
    params: () => (this.esPadre ? this.hijoActivo.elegidoId() : 0),
    stream: () => {
      if (this.espacio.tipo !== 'colegio') return of(null);
      // A student's grades hang on their student record, not on the account
      const estudianteId$ = this.esPadre
        ? this.hijoActivo.activo().pipe(map((h) => h?.id ?? null))
        : this.calificaciones.myRecords().pipe(map((fichas) => fichas.find((f) => f.tipo === 'estudiante')?.id ?? null));
      return estudianteId$.pipe(
        switchMap((id) =>
          !id
            ? of(null)
            : forkJoin({ notas: this.calificaciones.studentGrades(id), gestion: this.academico.getActiveAcademicYear(this.espacio.id) }).pipe(
                map(({ notas, gestion }) => ({
                  estudiante: notas.estudiante,
                  notas,
                  gestion,
                  datos: {
                    gestion: { anio: notas.gestion.anio, periodos: notas.gestion.periodos.map((nombre) => ({ nombre })) },
                    config: notas.config,
                  },
                })),
              ),
        ),
      );
    },
  });

  readonly pestana = linkedSignal(() => {
    const v = this.vista.value();
    return v?.gestion ? periodoDeFecha(v.gestion, todayIso()) : 0;
  });

  readonly cerrado = (i: number) => !!this.vista.value()?.notas.materias[0]?.periodos.find((p) => p.periodo === i)?.cerrado;

  // Grade of each subject in the chosen period, with the detail by criterion and activity
  readonly materias = computed(() => {
    const v = this.vista.value();
    const periodo = this.pestana();
    if (!v || periodo === BOLETIN) return [];
    return v.notas.materias.map((m) => {
      const p = m.periodos.find((x) => x.periodo === periodo);
      return {
        materia: m.materia,
        docente: m.docente ?? 'Sin docente',
        resultado: {
          final: p?.final ?? null,
          porCriterio: (p?.porCriterio ?? []).map((c) => ({ criterio: { id: c.criterioId, nombre: c.nombre, porcentaje: c.porcentaje }, promedio: c.promedio })),
        },
        actividades: (p?.actividades ?? []).map((a) => ({ actividad: { id: a.id, nombre: a.nombre, fecha: a.fecha }, criterio: a.criterio, nota: a.valor ?? undefined })),
      };
    });
  });

  readonly resumen = computed(() => {
    const config = this.vista.value()?.notas.config;
    const finales = this.materias().map((m) => m.resultado.final).filter((f): f is number => f !== null);
    const calificadas = this.materias().reduce((s, m) => s + m.actividades.filter((a) => a.nota !== undefined).length, 0);
    return {
      promedio: promedio(finales),
      aprobadas: config ? finales.filter((f) => f >= config.notaAprobacion).length : 0,
      conNota: finales.length,
      calificadas,
    };
  });

  aprueba(nota: number): boolean {
    return nota >= (this.vista.value()?.notas.config.notaAprobacion ?? 0);
  }

  porcentaje(nota: number): number {
    return Math.round((nota / (this.vista.value()?.notas.config.notaMaxima ?? 100)) * 100);
  }
}
