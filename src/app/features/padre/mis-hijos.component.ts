import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBullhorn, faCalendarDays, faTasks, faChartLine, faChild, faCircleCheck, faFileMedical, faStar, faTriangleExclamation, faUserCheck, faUserXmark,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { PARENTESCOS, edad, iniciales } from '../../core/models/personas.model';
import { contar, fechaCorta, hoyIso, sumarDias } from '../../core/utils/asistencia';
import { aprobado, boletinDe, indiceNotas, periodoDeFecha, promedio } from '../../core/utils/calificaciones';
import { AsistenciaService } from '../../services/asistencia.service';
import { CalificacionesService } from '../../services/calificaciones.service';
import { ComunicadosService } from '../../services/comunicados.service';
import { Hijo, HijoActivoService } from '../../services/hijo-activo.service';
import { TareasService } from '../../services/tareas.service';
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
  selector: 'app-mis-hijos',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './mis-hijos.component.html',
  styleUrls: ['./mis-hijos.component.css'],
})
export class MisHijosComponent {
  private session = inject(SessionService);
  private router = inject(Router);
  private hijoActivo = inject(HijoActivoService);
  private asistencia = inject(AsistenciaService);
  private calificaciones = inject(CalificacionesService);
  private comunicados = inject(ComunicadosService);
  private tareas = inject(TareasService);

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

  private readonly espacioId = this.session.espacioActivo()!.id;
  private readonly hoy = hoyIso();

  readonly fichas = rxResource({
    stream: () =>
      this.hijoActivo.hijos().pipe(
        switchMap((hijos) => (hijos.length ? forkJoin(hijos.map((h) => this.ficha(h))) : of([]))),
      ),
    defaultValue: [],
  });

  readonly sinLeer = rxResource({
    stream: () => this.comunicados.recibidos(this.espacioId, this.session.usuarioId()!).pipe(map((cs) => cs.filter((c) => !c.lectura).length)),
    defaultValue: 0,
  });

  readonly totalAlertas = computed(() => this.fichas.value().reduce((s, f) => s + f.alertas.length, 0));

  ruta(...segmentos: string[]) {
    return this.session.rutaRol(...segmentos);
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
      registros: this.asistencia.registrosDeEstudiante(hijo.id),
      licencias: this.asistencia.licenciasDeEstudiante(hijo.id),
      tareas: this.tareas.tareasDeEstudiante(this.espacioId, hijo.id),
      datos: hijo.paraleloId ? this.calificaciones.datosDeParalelo(this.espacioId, hijo.paraleloId) : of(null),
    }).pipe(
      map(({ registros, licencias, tareas, datos }): FichaHijo => {
        const desde = sumarDias(this.hoy, -14);
        const recientes = registros.filter((r) => r.fecha >= desde && r.estado === 'ausente');
        const indice = datos ? periodoDeFecha(datos.gestion, this.hoy) : 0;
        const notas = datos ? boletinDe(datos, indiceNotas(datos.notas), hijo.id).map((f) => ({ materia: f.materia.nombre, nota: f.periodos[indice] })) : [];
        const reprobadas = datos ? notas.filter((n) => n.nota !== null && !aprobado(datos.config, n.nota)) : [];
        const alertas: Alerta[] = [
          ...reprobadas.map((n) => ({ tipo: 'nota' as const, texto: `${n.materia}: ${n.nota} (bajo ${datos!.config.notaAprobacion})` })),
          ...(recientes.length ? [{ tipo: 'falta' as const, texto: `${recientes.length} ${recientes.length === 1 ? 'falta' : 'faltas'} a clases en las últimas dos semanas` }] : []),
          ...tareas.filter((t) => t.estado === 'no-entregada').map((t) => ({ tipo: 'tarea' as const, texto: `No entregó la tarea "${t.tarea.titulo}" (${t.tarea.materia.nombre})` })),
          ...licencias.filter((l) => l.estado === 'pendiente').map((l) => ({ tipo: 'licencia' as const, texto: `Licencia del ${fechaCorta(l.desde)} pendiente de aprobación` })),
        ];
        return {
          hijo,
          edad: edad(hijo.fechaNacimiento, this.hoy),
          asistencia: contar(registros),
          faltasRecientes: recientes.length,
          periodo: datos?.gestion.periodos[indice]?.nombre ?? '',
          promedio: promedio(notas.map((n) => n.nota)),
          reprobadas: reprobadas.map((n) => n.materia),
          alertas,
        };
      })
    );
  }
}
