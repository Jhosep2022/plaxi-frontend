import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBullhorn, faCalendarDays, faTasks, faChartLine, faChild, faCircleCheck, faFileMedical, faStar, faTriangleExclamation, faUserCheck, faUserXmark,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { PARENTESCOS, edad, iniciales } from '../../core/models/people.model';
import { contar, formatShortDate, todayIso, addDays } from '../../core/utils/attendance';
import { periodoDeFecha, promedio } from '../../core/utils/grades';
import { AttendanceService } from '../../services/attendance.service';
import { GradesApiService } from '../../services/grades-api.service';
import { AcademicsService } from '../../services/academics.service';
import { AnnouncementsService } from '../../services/announcements.service';
import { Hijo, SelectedChildService } from '../../services/selected-child.service';
import { AssignmentsService } from '../../services/assignments.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';

interface Alerta {
  tipo: 'falta' | 'nota' | 'licencia' | 'tarea';
  texto: string;
}

interface FichaHijo {
  hijo: Hijo;
  edad: number;
  asistencia: ReturnType<typeof contar>;
  faltasRecientes: number;
  periodo: string;
  promedio: number | null;
  reprobadas: string[];
  alertas: Alerta[];
}

// "Mis hijos": una ficha por cada estudiante a cargo del padre, con su asistencia, notas y alertas
@Component({
  selector: 'app-my-children',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './my-children.component.html',
  styleUrls: ['./my-children.component.css'],
})
export class MyChildrenComponent {
  private session = inject(SessionService);
  private router = inject(Router);
  private hijoActivo = inject(SelectedChildService);
  private asistencia = inject(AttendanceService);
  private calificaciones = inject(GradesApiService);
  private academico = inject(AcademicsService);
  private comunicados = inject(AnnouncementsService);
  private tareas = inject(AssignmentsService);

  readonly iniciales = iniciales;
  readonly faBullhorn = faBullhorn;
  readonly faTasks = faTasks;
  readonly faCalendarDays = faCalendarDays;
  readonly faChartLine = faChartLine;
  readonly faChild = faChild;
  readonly faCircleCheck = faCircleCheck;
  readonly faFileMedical = faFileMedical;
  readonly faStar = faStar;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faUserCheck = faUserCheck;
  readonly faUserXmark = faUserXmark;

  private readonly espacioId = this.session.activeSpace()!.id;
  private readonly hoy = todayIso();

  readonly fichas = rxResource({
    stream: () =>
      this.hijoActivo.hijos().pipe(
        switchMap((hijos) => (hijos.length ? forkJoin(hijos.map((h) => this.ficha(h))) : of([]))),
      ),
    defaultValue: [],
  });

  readonly sinLeer = rxResource({
    stream: () => this.comunicados.recibidos().pipe(map((cs) => cs.filter((c) => !c.lectura).length)),
    defaultValue: 0,
  });

  readonly totalAlertas = computed(() => this.fichas.value().reduce((s, f) => s + f.alertas.length, 0));

  ruta(...segmentos: string[]) {
    return this.session.roleRoute(...segmentos);
  }

  parentesco(h: Hijo): string {
    return PARENTESCOS.find((p) => p.id === h.parentesco)?.label ?? '';
  }

  // Abre una sección del padre con este hijo elegido
  ir(h: Hijo, seccion: string): void {
    this.hijoActivo.elegir(h.id);
    this.router.navigate(this.ruta(seccion));
  }

  private ficha(hijo: Hijo) {
    return forkJoin({
      registros: this.asistencia.getStudentRecords(hijo.id),
      licencias: this.asistencia.getStudentLeaveRequests(hijo.id),
      tareas: this.tareas.tareasDeEstudiante(this.espacioId, hijo.id),
      // The report card computed by the API (grade of each subject in each period)
      boletin: hijo.paraleloId ? this.calificaciones.reportCard(hijo.id).pipe(catchError(() => of(null))) : of(null),
      gestion: this.academico.getActiveAcademicYear(this.espacioId),
    }).pipe(
      map(({ registros, licencias, tareas, boletin, gestion }): FichaHijo => {
        const desde = addDays(this.hoy, -14);
        const recientes = registros.filter((r) => r.fecha >= desde && r.estado === 'ausente');
        const indice = gestion ? periodoDeFecha(gestion, this.hoy) : 0;
        const notas = (boletin?.filas ?? []).map((f) => ({ materia: f.materia.nombre, nota: f.periodos[indice] ?? null }));
        const aprobacion = boletin?.notaAprobacion ?? 0;
        const reprobadas = notas.filter((n) => n.nota !== null && n.nota < aprobacion);
        const alertas: Alerta[] = [
          ...reprobadas.map((n) => ({ tipo: 'nota' as const, texto: `${n.materia}: ${n.nota} (bajo ${aprobacion})` })),
          ...(recientes.length ? [{ tipo: 'falta' as const, texto: `${recientes.length} ${recientes.length === 1 ? 'falta' : 'faltas'} a clases en las últimas dos semanas` }] : []),
          ...tareas.filter((t) => t.estado === 'no-entregada').map((t) => ({ tipo: 'tarea' as const, texto: `No entregó la tarea "${t.tarea.titulo}" (${t.tarea.materia.nombre})` })),
          ...licencias.filter((l) => l.estado === 'pendiente').map((l) => ({ tipo: 'licencia' as const, texto: `Licencia del ${formatShortDate(l.desde)} pendiente de aprobación` })),
        ];
        return {
          hijo,
          edad: edad(hijo.fechaNacimiento, this.hoy),
          asistencia: contar(registros),
          faltasRecientes: recientes.length,
          periodo: gestion?.periodos[indice]?.nombre ?? '',
          promedio: promedio(notas.map((n) => n.nota)),
          reprobadas: reprobadas.map((n) => n.materia),
          alertas,
        };
      })
    );
  }
}
