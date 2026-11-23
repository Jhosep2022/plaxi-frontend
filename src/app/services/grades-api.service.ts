import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import type { IconoMateria } from '../core/models/academics.model';
import type { CierrePeriodo, ConfigCalificacion, Criterio } from '../core/models/grades.model';
import type { ResultadoMateria } from '../core/utils/grades';
import { fechaBolivia } from '../core/utils/bolivia-time';

// ---------- Shapes of /api/espacios/:slug/calificaciones ----------
export interface Escala {
  notaMaxima: number;
  notaAprobacion: number;
  criterios: Criterio[];
}

export interface ActividadPlanilla {
  id: number;
  nombre: string;
  fecha: string;
  criterioId: number;
  origen: 'manual' | 'tarea' | 'quiz';
}

export interface FilaPlanilla {
  id: number; // student record
  nombre: string;
  notas: Record<number, number | null>;
  resultado: ResultadoMateria;
  aprueba: boolean | null;
}

export interface Planilla {
  gestion: { id: number; anio: number; periodos: { nombre: string; inicio: string; fin: string }[] };
  periodo: number;
  cerrado: boolean;
  editable: boolean;
  config: Escala;
  actividades: ActividadPlanilla[];
  estudiantes: FilaPlanilla[];
  resumen: { promedio: number | null; aprobados: number; reprobados: number };
}

export interface CambioNota {
  actividadId: number;
  estudianteId: number;
  valor: number | null; // null deletes the grade
}

export interface AvanceCarga {
  paralelo: string;
  paraleloId: number;
  materia: string;
  materiaId: number;
  docente: string;
  periodos: { periodo: number; cerrado: boolean; actividades: number; notas: number; esperadas: number; porcentaje: number }[];
}

export interface MateriaResumen {
  id: number;
  nombre: string;
  icono: IconoMateria;
  tono: 'lima' | 'azul' | 'crema';
}

export interface NotasEstudiante {
  estudiante: { id: number; nombre: string };
  paralelo: string | null;
  gestion: { anio: number; periodos: string[] };
  config: Escala;
  materias: {
    materia: MateriaResumen;
    docente: string | null;
    periodos: {
      periodo: number;
      cerrado: boolean;
      final: number | null;
      porCriterio: { criterioId: number; nombre: string; porcentaje: number; promedio: number | null }[];
      actividades: { id: number; nombre: string; fecha: string; criterio: string; valor: number | null }[];
    }[];
  }[];
}

export interface EncabezadoInstitucion {
  nombre: string;
  codigoSie: string;
  logoArchivoId: number | null;
}

export interface Boletin {
  institucion: EncabezadoInstitucion;
  estudiante: { id: number; nombre: string; ci: string };
  paralelo: string | null;
  gestion: { anio: number; periodos: string[] };
  cerrados: number[];
  notaMaxima: number;
  notaAprobacion: number;
  filas: { materia: MateriaResumen; docente: string | null; periodos: (number | null)[]; anual: number | null; aprueba: boolean | null }[];
  promedioGeneral: number | null;
}

export interface Centralizador {
  institucion: EncabezadoInstitucion;
  paralelo: string;
  periodo: string;
  cerrado: boolean;
  notaAprobacion: number;
  materias: MateriaResumen[];
  filas: { estudiante: { id: number; nombre: string }; notas: (number | null)[]; promedio: number | null; reprobadas: number }[];
  promediosPorMateria: (number | null)[];
}

// Grades of a school through the API: scale, activities and grades of a sheet, period closing and reports.
// The server computes finals, report cards and the class summary; the screens only show them.
@Injectable({ providedIn: 'root' })
export class GradesApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  private get url(): string {
    return `${this.base}/calificaciones`;
  }

  // ---------- Scale ----------
  getConfig(): Observable<ConfigCalificacion> {
    const espacioId = this.session.activeSpace()?.id ?? 0;
    return this.http.get<Escala>(`${this.url}/config`).pipe(map((e) => ({ id: espacioId, ...e })));
  }

  saveConfig(config: ConfigCalificacion): Observable<ConfigCalificacion> {
    const { notaMaxima, notaAprobacion, criterios } = config;
    return this.http
      .put<Escala>(`${this.url}/config`, { notaMaxima, notaAprobacion, criterios: criterios.map((c) => ({ ...(c.id > 0 ? { id: c.id } : {}), nombre: c.nombre.trim(), porcentaje: c.porcentaje })) })
      .pipe(map((e) => ({ id: config.id, ...e })));
  }

  // ---------- Period closing ----------
  getClosures(): Observable<CierrePeriodo[]> {
    return this.http.get<{ id: number; espacioId: number; gestionId: number; periodo: number; cerradoEl?: string; creado?: string }[]>(`${this.url}/cierres`).pipe(
      map((lista) => lista.map((c) => ({ id: c.id, espacioId: c.espacioId, gestionId: c.gestionId, periodo: c.periodo, cerradoEl: fechaBolivia(c.cerradoEl ?? c.creado ?? '') }))),
    );
  }

  closePeriod(periodo: number): Observable<{ notasCongeladas: number }> {
    return this.http.post<{ notasCongeladas: number }>(`${this.url}/periodos/${periodo}/cierre`, {});
  }

  reopenPeriod(periodo: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/periodos/${periodo}/cierre`);
  }

  progress(): Observable<AvanceCarga[]> {
    return this.http.get<AvanceCarga[]>(`${this.url}/progreso`);
  }

  // Load progress added up per period, to decide whether it can be closed
  progressByPeriod(periodos: number): Observable<{ actividades: number; notasCargadas: number; notasEsperadas: number; materiasSinActividades: number }[]> {
    return this.progress().pipe(
      map((avance) =>
        Array.from({ length: periodos }, (_, i) => {
          const delPeriodo = avance.map((a) => a.periodos.find((p) => p.periodo === i));
          return {
            actividades: delPeriodo.reduce((s, p) => s + (p?.actividades ?? 0), 0),
            notasCargadas: delPeriodo.reduce((s, p) => s + (p?.notas ?? 0), 0),
            notasEsperadas: delPeriodo.reduce((s, p) => s + (p?.esperadas ?? 0), 0),
            materiasSinActividades: delPeriodo.filter((p) => !p?.actividades).length,
          };
        }),
      ),
    );
  }

  // ---------- Sheet of a subject in a class group and period ----------
  sheet(paraleloId: number, materiaId: number, periodo: number): Observable<Planilla> {
    return this.http.get<Planilla>(`${this.url}/planilla`, { params: { paralelo: paraleloId, materia: materiaId, periodo } });
  }

  saveGrades(cambios: CambioNota[]): Observable<number> {
    return this.http.put<{ guardadas: number }>(`${this.url}/notas`, { cambios }).pipe(map((r) => r.guardadas));
  }

  createActivity(actividad: { paraleloId: number; materiaId: number; periodo: number; criterioId: number; nombre: string; fecha: string }): Observable<ActividadPlanilla> {
    return this.http.post<ActividadPlanilla>(`${this.url}/actividades`, { ...actividad, nombre: actividad.nombre.trim() });
  }

  updateActivity(id: number, cambios: { criterioId: number; nombre: string; fecha: string }): Observable<ActividadPlanilla> {
    return this.http.patch<ActividadPlanilla>(`${this.url}/actividades/${id}`, { ...cambios, nombre: cambios.nombre.trim() });
  }

  deleteActivity(id: number): Observable<void> {
    return this.http.delete(`${this.url}/actividades/${id}`).pipe(map(() => undefined));
  }

  // ---------- Reports ----------
  studentGrades(estudianteId: number): Observable<NotasEstudiante> {
    return this.http.get<NotasEstudiante>(`${this.url}/estudiantes/${estudianteId}`);
  }

  reportCard(estudianteId: number): Observable<Boletin> {
    return this.http.get<Boletin>(`${this.url}/boletin/${estudianteId}`);
  }

  summarySheet(paraleloId: number, periodo: number): Observable<Centralizador> {
    return this.http.get<Centralizador>(`${this.url}/centralizador`, { params: { paralelo: paraleloId, periodo } });
  }

  // The signed-in person's records in this school (teacher assignments point to the record, not the account)
  myRecords(): Observable<{ id: number; tipo: string }[]> {
    return this.http.get<{ fichas: { id: number; tipo: string }[] }>(`${this.base}/yo`).pipe(map((yo) => yo.fichas));
  }
}
