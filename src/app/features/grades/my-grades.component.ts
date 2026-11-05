import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookOpen, faChartLine, faCircleCheck, faFileLines, faLock, faStar } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { formatShortDate, todayIso } from '../../core/utils/attendance';
import { aprobado, calcularNota, indiceNotas, periodoDeFecha, promedio } from '../../core/utils/grades';
import { AcademicsService } from '../../services/academics.service';
import { GradesService } from '../../services/grades.service';
import { SelectedChildService } from '../../services/selected-child.service';
import { ChildSelectorComponent } from '../../shared/ui/child-selector.component';
import { ProfileService } from '../../services/profile.service';
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
  private calificaciones = inject(GradesService);
  private perfiles = inject(ProfileService);
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
  private readonly usuarioId = this.session.userId()!;

  // Estudiante (el propio o el hijo) y los datos de su paralelo
  readonly vista = rxResource({
    params: () => (this.esPadre ? this.hijoActivo.elegidoId() : 0),
    stream: () => {
      if (this.espacio.tipo !== 'colegio') return of(null);
      const id$ = this.esPadre ? this.hijoActivo.activo().pipe(map((h) => h?.id ?? 0)) : of(this.usuarioId);
      return id$.pipe(
        switchMap((id) =>
          !id
            ? of(null)
            : forkJoin({ perfil: this.perfiles.getProfile(id), paraleloId: this.academico.getStudentClassGroup(id) }).pipe(
                switchMap(({ perfil, paraleloId }) =>
                  this.calificaciones.getClassGroupData(this.espacio.id, paraleloId).pipe(map((datos) => (datos ? { estudiante: { id, nombre: datos.estudiantes.find((e) => e.id === id)?.nombre ?? perfil.nombre }, datos } : null)))
                )
              )
        )
      );
    },
  });

  readonly pestana = linkedSignal(() => {
    const v = this.vista.value();
    return v ? periodoDeFecha(v.datos.gestion, todayIso()) : 0;
  });

  readonly cerrado = (i: number) => !!this.vista.value()?.datos.cierres.some((c) => c.periodo === i);

  // Nota de cada materia en el periodo elegido, con el detalle por criterio y actividad
  readonly materias = computed(() => {
    const v = this.vista.value();
    const periodo = this.pestana();
    if (!v || periodo === BOLETIN) return [];
    const { datos, estudiante } = v;
    const nota = indiceNotas(datos.notas);
    return datos.materias.map((materia) => {
      const actividades = datos.actividades.filter((a) => a.materiaId === materia.id && a.periodo === periodo);
      const docenteId = datos.asignaciones.find((a) => a.materiaId === materia.id)?.docenteId;
      return {
        materia,
        docente: datos.docentes.find((d) => d.id === docenteId)?.nombre ?? 'Sin docente',
        resultado: calcularNota(datos.config.criterios, actividades, nota, estudiante.id),
        actividades: actividades.map((a) => ({
          actividad: a,
          criterio: datos.config.criterios.find((c) => c.id === a.criterioId)?.nombre ?? '',
          nota: nota(a.id, estudiante.id),
        })),
      };
    });
  });

  readonly resumen = computed(() => {
    const config = this.vista.value()?.datos.config;
    const finales = this.materias().map((m) => m.resultado.final).filter((f): f is number => f !== null);
    const calificadas = this.materias().reduce((s, m) => s + m.actividades.filter((a) => a.nota !== undefined).length, 0);
    return {
      promedio: promedio(finales),
      aprobadas: config ? finales.filter((f) => aprobado(config, f)).length : 0,
      conNota: finales.length,
      calificadas,
    };
  });

  aprueba(nota: number): boolean {
    const config = this.vista.value()?.datos.config;
    return !!config && aprobado(config, nota);
  }

  porcentaje(nota: number): number {
    return Math.round((nota / (this.vista.value()?.datos.config.notaMaxima ?? 100)) * 100);
  }
}
