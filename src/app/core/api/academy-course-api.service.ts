import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';
import type { Aula } from '../models/classrooms.model';
import type { AulaResumen } from '../../services/classrooms.service';
import type { DatosCurso } from '../../services/academy.service';

interface ApiCourse extends Omit<Aula, 'paraleloId' | 'materiaId' | 'codigo' | 'actualizado'> {
  paraleloId: number | null;
  materiaId: number | null;
  codigo: string | null;
  actualizado: string;
}

interface ApiCourseSummary extends ApiCourse {
  curso: string;
  docente: string;
  estudiantes: number;
  unidades: number;
  temas: number;
  tareas: number;
  quiz: number;
  pendientes: number;
  chips: string[];
  avance: number | null;
}

export interface ApiInvitedCourse {
  id: number;
  nombre: string;
  descripcion: string;
  portada: string;
  icono: Aula['icono'];
  tono: Aula['tono'];
  categoria: string;
  nivel: string;
  visibilidad: Aula['visibilidad'];
  aprobacionManual: boolean;
  docente: string;
  unidades: number;
  temas: number;
  estudiantes: number;
  estado: 'ninguna' | 'activa' | 'pendiente' | 'rechazada';
  espacio: { slug: string; nombre: string };
}

function asCourse(course: ApiCourse): Aula {
  return { ...course, paraleloId: course.paraleloId ?? 0, materiaId: course.materiaId ?? 0, codigo: course.codigo ?? '' };
}

function asSummary(course: ApiCourseSummary, spaceId: number, userId: number): AulaResumen {
  return {
    ...asCourse(course), espacioId: spaceId, docenteId: userId,
    curso: course.curso, docente: course.docente, estudiantes: course.estudiantes,
    unidades: course.unidades, temas: course.temas, tareas: course.tareas, quiz: course.quiz,
    pendientes: course.pendientes, chips: course.chips,
    anillos: [{ label: 'Avance del grupo', valor: course.avance }, { label: 'Entregas', valor: null }],
  };
}

@Injectable({ providedIn: 'root' })
export class AcademyCourseApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private get courseUrl(): string {
    const slug = this.session.activeSpace()?.slug;
    if (!slug) throw new Error('Selecciona una academia para gestionar cursos.');
    return `${environment.API_URL}/espacios/${encodeURIComponent(slug)}/cursos`;
  }

  create(data: DatosCurso): Observable<Aula> {
    return this.http.post<ApiCourse>(this.courseUrl, data).pipe(map(asCourse));
  }

  update(id: number, data: DatosCurso): Observable<Aula> {
    return this.http.put<ApiCourse>(`${this.courseUrl}/${id}`, data).pipe(map(asCourse));
  }

  regenerateCode(id: number): Observable<string> {
    return this.http.post<{ codigo: string }>(`${this.courseUrl}/${id}/codigo`, {}).pipe(map((result) => result.codigo));
  }

  list(role: 'docente' | 'estudiante'): Observable<AulaResumen[]> {
    const slug = this.session.activeSpace()?.slug;
    if (!slug) throw new Error('Selecciona una academia para ver sus cursos.');
    return this.http.get<ApiCourseSummary[]>(`${environment.API_URL}/espacios/${encodeURIComponent(slug)}/aulas`, { params: { rol: role } })
      .pipe(map((courses) => courses.map((course) => asSummary(course, this.session.activeSpace()!.id, role === 'docente' ? this.session.userId()! : 0))));
  }

  detail(id: number): Observable<AulaResumen> {
    const slug = this.session.activeSpace()?.slug;
    if (!slug) throw new Error('Selecciona una academia para ver el curso.');
    return this.http.get<ApiCourseSummary>(`${environment.API_URL}/espacios/${encodeURIComponent(slug)}/aulas/${id}`)
      .pipe(map((course) => asSummary(course, this.session.activeSpace()!.id, this.session.activeRole() === 'docente' ? this.session.userId()! : 0)));
  }

  invitation(code: string): Observable<ApiInvitedCourse> {
    return this.http.get<ApiInvitedCourse>(`${environment.API_URL}/cursos/codigo/${encodeURIComponent(code)}`);
  }

  enroll(code: string): Observable<{ estado: 'activa' | 'pendiente'; aulaId: number }> {
    return this.http.post<{ estado: 'activa' | 'pendiente'; aulaId: number }>(`${environment.API_URL}/cursos/codigo/${encodeURIComponent(code)}/inscripcion`, {});
  }
}
