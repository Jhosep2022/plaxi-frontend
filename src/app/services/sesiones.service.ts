import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MINUTOS_ANTES } from '../core/models/sesiones.model';
import type { AsistenciaSesion, EstadoSesion, Sesion } from '../core/models/sesiones.model';
import { aHora, aMinutos } from '../core/utils/jornada';
import { porcentaje } from '../core/utils/reportes';
import { ahoraIso } from '../core/utils/tareas';
import { MOCK_AULAS_VIRTUALES, estudiantesDeAula } from '../mocks/aulas.mock';
import { MOCK_DELAY, MOCK_INSCRIPCIONES } from '../mocks/mock-data';
import { MOCK_ASISTENCIA_SESIONES, MOCK_SESIONES } from '../mocks/sesiones.mock';
import { RepositorioMock } from './repositorio-mock';

export interface SesionVista extends Sesion {
  curso: string;
  estado: EstadoSesion;
  asistentes: number;
  estudiantes: number;
  asisti: boolean; // para el estudiante que la mira
}

export interface AsistenteSesion {
  estudianteId: number;
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
  const ahora = ahoraIso().slice(0, 16);
  const apertura = `${s.fecha}T${aHora(Math.max(0, aMinutos(s.inicio) - MINUTOS_ANTES))}`;
  if (ahora > `${s.fecha}T${s.fin}`) return 'finalizada';
  return ahora >= apertura ? 'en-curso' : 'proxima';
}

const nombreDe = (id: number) => MOCK_INSCRIPCIONES.find((i) => i.usuarioId === id)?.usuarioNombre ?? `Estudiante ${id}`;

// Sesiones en vivo de los cursos de academia y su asistencia.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class SesionesService {
  private sesionesRepo = new RepositorioMock<Sesion>(MOCK_SESIONES);
  private asistenciaRepo = new RepositorioMock<AsistenciaSesion>(MOCK_ASISTENCIA_SESIONES);

  sesionesDocente(espacioId: number, docenteId: number): Observable<SesionVista[]> {
    const cursos = MOCK_AULAS_VIRTUALES.filter((a) => a.espacioId === espacioId && a.tipo === 'curso' && a.docenteId === docenteId).map((a) => a.id);
    return this.responder(this.sesionesRepo.ahora((s) => cursos.includes(s.aulaId)).map((s) => this.vista(s, null)));
  }

  sesionesEstudiante(espacioId: number, estudianteId: number): Observable<SesionVista[]> {
    const cursos = MOCK_AULAS_VIRTUALES.filter((a) => a.espacioId === espacioId && a.tipo === 'curso' && estudiantesDeAula(a).includes(estudianteId)).map((a) => a.id);
    return this.responder(this.sesionesRepo.ahora((s) => cursos.includes(s.aulaId)).map((s) => this.vista(s, estudianteId)));
  }

  guardar(borrador: BorradorSesion): Observable<Sesion> {
    if (!borrador.titulo.trim()) return throwError(() => new Error('Ponle un título a la sesión.'));
    if (!/^https?:\/\/\S+\.\S+/.test(borrador.enlace.trim())) return throwError(() => new Error('Pega el enlace de la reunión (empieza con https://).'));
    if (aMinutos(borrador.fin) <= aMinutos(borrador.inicio)) return throwError(() => new Error('La hora de fin debe ser posterior a la de inicio.'));
    if (!borrador.id && `${borrador.fecha}T${borrador.fin}` < ahoraIso().slice(0, 16)) return throwError(() => new Error('No se puede programar una sesión en el pasado.'));
    const previa = borrador.id ? this.sesionesRepo.ahora((s) => s.id === borrador.id)[0] : undefined;
    return this.sesionesRepo.guardar({ ...borrador, titulo: borrador.titulo.trim(), enlace: borrador.enlace.trim(), grabacion: previa?.grabacion ?? '' });
  }

  eliminar(sesionId: number): Observable<void> {
    for (const a of this.asistenciaRepo.ahora((x) => x.sesionId === sesionId)) this.asistenciaRepo.eliminar(a.id);
    return this.sesionesRepo.eliminar(sesionId);
  }

  guardarGrabacion(sesionId: number, enlace: string): Observable<Sesion> {
    const s = this.sesionesRepo.ahora((x) => x.id === sesionId)[0];
    if (!s) return throwError(() => new Error('La sesión ya no existe.'));
    if (enlace && !/^https?:\/\/\S+/.test(enlace.trim())) return throwError(() => new Error('El enlace de la grabación debe empezar con https://.'));
    return this.sesionesRepo.guardar({ ...s, grabacion: enlace.trim() });
  }

  // El estudiante entra a la sesión: queda registrada su asistencia y recibe el enlace
  unirse(sesionId: number, estudianteId: number): Observable<string> {
    const s = this.sesionesRepo.ahora((x) => x.id === sesionId)[0];
    if (!s) return throwError(() => new Error('La sesión ya no existe.'));
    const estado = estadoSesion(s);
    if (estado === 'proxima') return throwError(() => new Error(`La sesión abre ${MINUTOS_ANTES} minutos antes de empezar.`));
    if (estado === 'finalizada') return throwError(() => new Error('La sesión ya terminó.'));
    if (!this.asistenciaRepo.ahora((a) => a.sesionId === sesionId && a.estudianteId === estudianteId).length) {
      this.asistenciaRepo.guardar({ sesionId, estudianteId, unidoEl: ahoraIso() });
    }
    return of(s.enlace).pipe(delay(MOCK_DELAY));
  }

  asistentes(sesionId: number): Observable<AsistenteSesion[]> {
    const s = this.sesionesRepo.ahora((x) => x.id === sesionId)[0];
    const aula = s ? MOCK_AULAS_VIRTUALES.find((a) => a.id === s.aulaId) : undefined;
    const registros = this.asistenciaRepo.ahora((a) => a.sesionId === sesionId);
    const lista = (aula ? estudiantesDeAula(aula) : []).map((id) => {
      const r = registros.find((x) => x.estudianteId === id);
      return { estudianteId: id, nombre: nombreDe(id), presente: !!r, unidoEl: r?.unidoEl ?? '' };
    });
    return this.responder(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  // El docente corrige la asistencia a mano
  marcar(sesionId: number, estudianteId: number, presente: boolean): Observable<void> {
    const previo = this.asistenciaRepo.ahora((a) => a.sesionId === sesionId && a.estudianteId === estudianteId)[0];
    if (presente && !previo) this.asistenciaRepo.guardar({ sesionId, estudianteId, unidoEl: ahoraIso() });
    if (!presente && previo) this.asistenciaRepo.eliminar(previo.id);
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // Asistencia de cada curso: sesiones finalizadas × estudiantes
  resumenAsistencia(espacioId: number, docenteId: number): Observable<ResumenAsistenciaCurso[]> {
    const cursos = MOCK_AULAS_VIRTUALES.filter((a) => a.espacioId === espacioId && a.tipo === 'curso' && a.docenteId === docenteId);
    const resumen = cursos.map((aula) => {
      const sesiones = this.sesionesRepo.ahora((s) => s.aulaId === aula.id).map((s) => this.vista(s, null)).filter((s) => s.estado === 'finalizada')
        .sort((a, b) => `${a.fecha}${a.inicio}`.localeCompare(`${b.fecha}${b.inicio}`));
      const ids = new Set(sesiones.map((s) => s.id));
      return {
        aulaId: aula.id,
        curso: aula.nombre,
        sesiones,
        estudiantes: estudiantesDeAula(aula).map((id) => {
          const presentes = new Set(this.asistenciaRepo.ahora((a) => a.estudianteId === id && ids.has(a.sesionId)).map((a) => a.sesionId));
          return { estudianteId: id, nombre: nombreDe(id), presentes, porcentaje: porcentaje(presentes.size, sesiones.length) };
        }).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      };
    });
    return this.responder(resumen);
  }

  private vista(s: Sesion, estudianteId: number | null): SesionVista {
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === s.aulaId);
    const registros = this.asistenciaRepo.ahora((a) => a.sesionId === s.id);
    return {
      ...structuredClone(s),
      curso: aula?.nombre ?? '',
      estado: estadoSesion(s),
      asistentes: registros.length,
      estudiantes: aula ? estudiantesDeAula(aula).length : 0,
      asisti: estudianteId !== null && registros.some((r) => r.estudianteId === estudianteId),
    };
  }

  private responder<T>(valor: T): Observable<T> {
    return of(valor).pipe(delay(MOCK_DELAY));
  }
}
