import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import { MINUTOS_ANTES } from '../core/models/sessions.model';
import type { EstadoSesion, Sesion } from '../core/models/sessions.model';
import { toTime, toMinutes } from '../core/utils/workday';
import { currentDateTimeIso } from '../core/utils/assignments';

export interface SesionVista extends Sesion {
  curso: string;
  estado: EstadoSesion;
  asistentes: number;
  estudiantes: number;
  asisti: boolean; // para el estudiante que la mira
}

export interface AsistenteSesion {
  estudianteId: number; // cuenta del estudiante
  nombre: string;
  presente: boolean;
  unidoEl: string;
}

export interface ResumenAsistenciaCurso {
  aulaId: number;
  curso: string;
  sesiones: SesionVista[]; // finalizadas, de la más antigua a la más reciente
  estudiantes: { estudianteId: number; nombre: string; presentes: Set<number>; porcentaje: number }[];
}

export type BorradorSesion = Omit<Sesion, 'id' | 'grabacion'> & { id?: number };

// Estado de una sesión según la hora actual (se puede entrar unos minutos antes)
export function estadoSesion(s: Pick<Sesion, 'fecha' | 'inicio' | 'fin'>): EstadoSesion {
  const ahora = currentDateTimeIso().slice(0, 16);
  const apertura = `${s.fecha}T${toTime(Math.max(0, toMinutes(s.inicio) - MINUTOS_ANTES))}`;
  if (ahora > `${s.fecha}T${s.fin}`) return 'finalizada';
  return ahora >= apertura ? 'en-curso' : 'proxima';
}

type SesionApi = Omit<SesionVista, 'descripcion' | 'grabacion'> & { descripcion: string | null; grabacion: string | null };

const vista = (s: SesionApi): SesionVista => ({ ...s, descripcion: s.descripcion ?? '', grabacion: s.grabacion ?? '' });

// Sesiones en vivo de los cursos de academia y su asistencia. El servidor guarda la asistencia al unirse
// y al estudiante le da el enlace de la reunión solo en ese momento.
@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  sesionesDocente(_espacioId?: number, _docenteId?: number): Observable<SesionVista[]> {
    return this.http.get<SesionApi[]>(`${this.base}/sesiones`, { params: { rol: 'docente' } }).pipe(map((l) => l.map(vista)));
  }

  sesionesEstudiante(_espacioId?: number, _estudianteId?: number): Observable<SesionVista[]> {
    return this.http.get<SesionApi[]>(`${this.base}/sesiones`, { params: { rol: 'estudiante' } }).pipe(map((l) => l.map(vista)));
  }

  guardar(borrador: BorradorSesion): Observable<Sesion> {
    if (!borrador.titulo.trim()) return throwError(() => new Error('Ponle un título a la sesión.'));
    if (toMinutes(borrador.fin) <= toMinutes(borrador.inicio)) return throwError(() => new Error('La hora de fin debe ser posterior a la de inicio.'));
    const { id, aulaId, ...datos } = borrador;
    const cuerpo = { ...datos, titulo: datos.titulo.trim(), enlace: datos.enlace.trim(), descripcion: datos.descripcion ?? '' };
    return id ? this.http.put<Sesion>(`${this.base}/sesiones/${id}`, cuerpo) : this.http.post<Sesion>(`${this.base}/cursos/${aulaId}/sesiones`, cuerpo);
  }

  eliminar(sesionId: number): Observable<void> {
    return this.http.delete(`${this.base}/sesiones/${sesionId}`).pipe(map(() => undefined));
  }

  guardarGrabacion(sesionId: number, enlace: string): Observable<Sesion> {
    return this.http.put<Sesion>(`${this.base}/sesiones/${sesionId}/grabacion`, { grabacion: enlace.trim() });
  }

  // El estudiante entra a la sesión: queda registrada su asistencia y recibe el enlace
  unirse(sesionId: number, _estudianteId?: number): Observable<string> {
    return this.http.post<{ enlace: string }>(`${this.base}/sesiones/${sesionId}/unirme`, {}).pipe(map((r) => r.enlace));
  }

  asistentes(sesionId: number): Observable<AsistenteSesion[]> {
    return this.http
      .get<{ usuarioId: number; nombre: string; presente: boolean; unidoEl: string | null }[]>(`${this.base}/sesiones/${sesionId}/asistentes`)
      .pipe(map((l) => l.map((a) => ({ estudianteId: a.usuarioId, nombre: a.nombre, presente: a.presente, unidoEl: a.unidoEl ?? '' }))));
  }

  // El docente corrige la asistencia a mano
  marcar(sesionId: number, estudianteId: number, presente: boolean): Observable<void> {
    return this.http.put(`${this.base}/sesiones/${sesionId}/asistentes/${estudianteId}`, { presente }).pipe(map(() => undefined));
  }

  // Asistencia de cada curso: sesiones finalizadas × estudiantes
  resumenAsistencia(_espacioId?: number, _docenteId?: number): Observable<ResumenAsistenciaCurso[]> {
    return this.http
      .get<{ aulaId: number; curso: string; sesiones: SesionApi[]; estudiantes: { usuarioId: number; nombre: string; presentes: number[]; porcentaje: number }[] }[]>(
        `${this.base}/asistencia-sesiones`,
      )
      .pipe(
        map((cursos) =>
          cursos.map((c) => ({
            aulaId: c.aulaId,
            curso: c.curso,
            sesiones: c.sesiones.map(vista),
            estudiantes: c.estudiantes.map((e) => ({ estudianteId: e.usuarioId, nombre: e.nombre, presentes: new Set(e.presentes), porcentaje: e.porcentaje })),
          })),
        ),
      );
  }
}
