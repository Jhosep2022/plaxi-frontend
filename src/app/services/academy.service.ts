import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Aula } from '../core/models/classrooms.model';
import { SessionService } from '../core/auth/session.service';
import { environment } from '../../environments/environment';

export type DatosCurso = Pick<Aula, 'nombre' | 'descripcion' | 'categoria' | 'nivel' | 'visibilidad' | 'aprobacionManual' | 'portada'>;
export type EstadoInscripcion = 'ninguna' | 'PENDIENTE' | 'ACTIVA' | 'RECHAZADA';

export interface CursoPublico {
  aula: Aula;
  docente: string;
  unidades: number;
  temas: number;
  estudiantes: number;
  estado: EstadoInscripcion; // de quien lo mira
}

export interface Solicitud {
  idInscripcion: number;
  aulaId: number;
  curso: string;
  usuarioId: number;
  nombre: string;
  gmail: string;
  fecha: string;
}

export interface EstudianteAcademia {
  usuarioId: number;
  nombre: string;
  gmail: string;
  cursos: { aulaId: number; nombre: string; progreso: number }[];
}

interface CursoPublicoApi extends Pick<Aula, 'id' | 'nombre' | 'descripcion' | 'portada' | 'icono' | 'tono' | 'categoria' | 'nivel' | 'visibilidad' | 'aprobacionManual'> {
  docente: string;
  unidades: number;
  temas: number;
  estudiantes: number;
  estado: 'ninguna' | 'pendiente' | 'activa' | 'rechazada';
  esMio: boolean;
}

const ESTADO: Record<CursoPublicoApi['estado'], EstadoInscripcion> = { ninguna: 'ninguna', pendiente: 'PENDIENTE', activa: 'ACTIVA', rechazada: 'RECHAZADA' };

// Cursos de academia: catálogo, inscripciones, solicitudes y estudiantes (la creación y el código van por AcademyCourseApiService)
@Injectable({ providedIn: 'root' })
export class AcademyService {
  private http = inject(HttpClient);
  private session = inject(SessionService);

  // ---------- Catálogo ----------
  // Cursos públicos de la academia, con el estado de inscripción de quien mira
  getCatalog(_espacioId?: number, _usuarioId?: number): Observable<CursoPublico[]> {
    const espacioId = this.session.activeSpace()?.id ?? 0;
    return this.http.get<CursoPublicoApi[]>(`${this.academyUrl()}/catalogo`).pipe(
      map((cursos) =>
        cursos
          .map(({ docente, unidades, temas, estudiantes, estado, esMio: _esMio, ...curso }) => ({
            aula: { ...curso, espacioId, tipo: 'curso' as const, docenteId: 0, paraleloId: 0, materiaId: 0, actualizado: '', codigo: '' },
            docente,
            unidades,
            temas,
            estudiantes,
            estado: ESTADO[estado],
          }))
          .sort((a, b) => a.aula.nombre.localeCompare(b.aula.nombre)),
      ),
    );
  }

  // Inscribe a quien mira (o deja la solicitud pendiente si el curso pide aprobación)
  enroll(aulaId: number, _usuarioId?: number): Observable<'ACTIVA' | 'PENDIENTE'> {
    return this.http
      .post<{ estado: 'activa' | 'pendiente' }>(`${this.academyUrl()}/cursos/${aulaId}/inscripcion`, {})
      .pipe(map((r) => (r.estado === 'activa' ? 'ACTIVA' : 'PENDIENTE')));
  }

  // ---------- Solicitudes y estudiantes (docente) ----------
  getRequests(espacioId: number, docenteId: number, aulaId?: number): Observable<Solicitud[]> {
    const base = this.academyUrl();
    return this.http.get<Array<{ id: number; aulaId: number; curso: string; usuarioId: number; nombre: string; correo: string; fecha: string }>>(
      `${base}/solicitudes`, { params: aulaId ? { curso: aulaId } : {} },
    ).pipe(map((requests) => requests.map(({ id, correo, ...request }) => ({ ...request, idInscripcion: id, gmail: correo }))));
  }

  respondToRequest(idInscripcion: number, aprobar: boolean): Observable<void> {
    return this.http.post<void>(`${this.academyUrl()}/solicitudes/${idInscripcion}/${aprobar ? 'aprobar' : 'rechazar'}`, {});
  }

  removeStudent(aulaId: number, usuarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.academyUrl()}/cursos/${aulaId}/estudiantes/${usuarioId}`);
  }

  // Estudiantes de todos los cursos del docente, con su avance en cada uno
  getStudents(espacioId: number, docenteId: number): Observable<EstudianteAcademia[]> {
    return this.http.get<Array<Omit<EstudianteAcademia, 'gmail'> & { correo: string }>>(
      `${this.academyUrl()}/cursos/estudiantes`,
    ).pipe(map((students) => students.map(({ correo, ...student }) => ({ ...student, gmail: correo }))));
  }

  // ---------- Interno ----------
  private academyUrl(): string {
    const slug = this.session.activeSpace()?.slug;
    if (!slug) throw new Error('Selecciona una academia.');
    return `${environment.API_URL}/espacios/${encodeURIComponent(slug)}`;
  }
}
