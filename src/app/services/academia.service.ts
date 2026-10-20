import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import type { Aula } from '../core/models/aulas.model';
import { Espacio } from '../core/models/espacio.model';
import { hoyIso } from '../core/utils/asistencia';
import { ahoraIso } from '../core/utils/tareas';
import { MOCK_DOCENTES } from '../mocks/academico.mock';
import { MOCK_AULAS_VIRTUALES, MOCK_TEMAS_AULA, MOCK_UNIDADES } from '../mocks/aulas.mock';
import { MOCK_DELAY, MOCK_ESPACIOS, MOCK_INSCRIPCIONES, MOCK_MEMBRESIAS, MOCK_PERFILES } from '../mocks/mock-data';
import { AulasService } from './aulas.service';
import { RepositorioMock } from './repositorio-mock';

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

const TONOS = ['lima', 'azul', 'crema'] as const;

// En la academia, el id del curso de las inscripciones es el id del aula menos 1000
const cursoIdDe = (aulaId: number) => aulaId - 1000;

// Cursos de academia: creación, invitaciones, catálogo, inscripciones y solicitudes.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class AcademiaService {
  private aulas = inject(AulasService);
  private aulasRepo = new RepositorioMock<Aula>(MOCK_AULAS_VIRTUALES);

  // ---------- Cursos ----------
  crearCurso(espacioId: number, docenteId: number, datos: DatosCurso): Observable<Aula> {
    const error = this.validar(datos);
    if (error) return throwError(() => new Error(error));
    const propios = this.aulasRepo.ahora((a) => a.espacioId === espacioId && a.tipo === 'curso').length;
    return this.aulasRepo.guardar({
      ...datos, nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim(),
      espacioId, tipo: 'curso', docenteId, paraleloId: 0, materiaId: 0,
      icono: /dise|ui|ux|figma|arte/i.test(`${datos.categoria} ${datos.nombre}`) ? 'arte' : /idiom|ingl/i.test(datos.categoria) ? 'idioma' : /matem/i.test(datos.categoria) ? 'calculadora' : 'computo',
      tono: TONOS[propios % 3], actualizado: ahoraIso(), codigo: this.nuevoCodigo(datos.nombre),
    });
  }

  actualizarCurso(aulaId: number, datos: DatosCurso): Observable<Aula> {
    const aula = this.aulasRepo.ahora((a) => a.id === aulaId)[0];
    if (!aula) return throwError(() => new Error('El curso ya no existe.'));
    const error = this.validar(datos);
    if (error) return throwError(() => new Error(error));
    return this.aulasRepo.guardar({ ...aula, ...datos, nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim() });
  }

  regenerarCodigo(aulaId: number): Observable<string> {
    const aula = this.aulasRepo.ahora((a) => a.id === aulaId)[0];
    if (!aula) return throwError(() => new Error('El curso ya no existe.'));
    aula.codigo = this.nuevoCodigo(aula.nombre);
    return of(aula.codigo).pipe(delay(MOCK_DELAY));
  }

  // ---------- Invitación y catálogo ----------
  cursoPorCodigo(codigo: string, usuarioId: number | null): Observable<(CursoPublico & { espacio: Espacio }) | null> {
    const aula = this.aulasRepo.ahora((a) => a.tipo === 'curso' && a.codigo.toLowerCase() === codigo.trim().toLowerCase())[0];
    const espacio = aula ? MOCK_ESPACIOS.find((e) => e.id === aula.espacioId) : undefined;
    return of(aula && espacio ? { ...this.publico(aula, usuarioId), espacio } : null).pipe(delay(MOCK_DELAY));
  }

  // Cursos públicos del espacio, con el estado de inscripción de quien mira
  catalogo(espacioId: number, usuarioId: number): Observable<CursoPublico[]> {
    const lista = this.aulasRepo.ahora((a) => a.espacioId === espacioId && a.tipo === 'curso' && a.visibilidad === 'publico').map((a) => this.publico(a, usuarioId));
    return of(lista.sort((a, b) => a.aula.nombre.localeCompare(b.aula.nombre))).pipe(delay(MOCK_DELAY));
  }

  // Inscribe al usuario (o deja la solicitud pendiente si el curso pide aprobación) y lo suma al espacio
  inscribirse(aulaId: number, usuarioId: number): Observable<'ACTIVA' | 'PENDIENTE'> {
    const aula = this.aulasRepo.ahora((a) => a.id === aulaId && a.tipo === 'curso')[0];
    if (!aula) return throwError(() => new Error('El curso ya no existe.'));
    if (aula.docenteId === usuarioId) return throwError(() => new Error('Eres el docente de este curso.'));
    const previa = MOCK_INSCRIPCIONES.find((i) => i.cursoId === cursoIdDe(aulaId) && i.usuarioId === usuarioId && i.estadoInscripcion !== 'BAJA');
    if (previa?.estadoInscripcion === 'ACTIVA') return throwError(() => new Error('Ya estás inscrito en este curso.'));
    if (previa?.estadoInscripcion === 'PENDIENTE') return throwError(() => new Error('Tu solicitud ya está pendiente de aprobación.'));
    const estado = aula.aprobacionManual ? 'PENDIENTE' : 'ACTIVA';
    const perfil = MOCK_PERFILES.find((p) => p.idUsuario === usuarioId);
    if (previa) {
      previa.estadoInscripcion = estado;
      previa.fechaInscripcion = hoyIso();
    } else {
      MOCK_INSCRIPCIONES.push({
        idInscripcion: Math.max(0, ...MOCK_INSCRIPCIONES.map((i) => i.idInscripcion)) + 1, fechaInscripcion: hoyIso(), estadoInscripcion: estado,
        usuarioId, usuarioNombre: perfil ? `${perfil.nombre} ${perfil.primerApellido}` : `Usuario ${usuarioId}`, usuarioGmail: perfil?.gmail ?? '',
        cursoId: cursoIdDe(aulaId), cursoNombre: aula.nombre, usuarioCreadorId: aula.docenteId, cursoDescripcion: aula.descripcion, cursoPortadaUrl: aula.portada || null,
      });
    }
    if (!MOCK_MEMBRESIAS.some((m) => m.usuarioId === usuarioId && m.espacioId === aula.espacioId)) {
      MOCK_MEMBRESIAS.push({ usuarioId, espacioId: aula.espacioId, rol: 'estudiante' });
    }
    return of(estado as 'ACTIVA' | 'PENDIENTE').pipe(delay(MOCK_DELAY));
  }

  // ---------- Solicitudes y estudiantes (docente) ----------
  solicitudes(espacioId: number, docenteId: number, aulaId?: number): Observable<Solicitud[]> {
    const cursos = this.cursosDe(espacioId, docenteId).filter((a) => !aulaId || a.id === aulaId);
    const lista = MOCK_INSCRIPCIONES
      .filter((i) => i.estadoInscripcion === 'PENDIENTE' && cursos.some((a) => cursoIdDe(a.id) === i.cursoId))
      .map((i) => ({
        idInscripcion: i.idInscripcion, aulaId: i.cursoId + 1000, curso: cursos.find((a) => cursoIdDe(a.id) === i.cursoId)!.nombre,
        usuarioId: i.usuarioId, nombre: i.usuarioNombre, gmail: i.usuarioGmail, fecha: i.fechaInscripcion,
      }))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  responder(idInscripcion: number, aprobar: boolean): Observable<void> {
    const i = MOCK_INSCRIPCIONES.find((x) => x.idInscripcion === idInscripcion);
    if (!i || i.estadoInscripcion !== 'PENDIENTE') return throwError(() => new Error('La solicitud ya fue respondida.'));
    i.estadoInscripcion = aprobar ? 'ACTIVA' : 'RECHAZADA';
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  quitar(aulaId: number, usuarioId: number): Observable<void> {
    const i = MOCK_INSCRIPCIONES.find((x) => x.cursoId === cursoIdDe(aulaId) && x.usuarioId === usuarioId && x.estadoInscripcion === 'ACTIVA');
    if (!i) return throwError(() => new Error('El estudiante ya no está en el curso.'));
    i.estadoInscripcion = 'BAJA';
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // Estudiantes de todos los cursos del docente, con su avance en cada uno
  estudiantes(espacioId: number, docenteId: number): Observable<EstudianteAcademia[]> {
    const cursos = this.cursosDe(espacioId, docenteId);
    if (!cursos.length) return of([]).pipe(delay(MOCK_DELAY));
    return forkJoin(cursos.map((a) => this.aulas.progresoGrupo(a.id).pipe(map((p) => ({ aula: a, progreso: p }))))).pipe(
      map((porCurso) => {
        const mapa = new Map<number, EstudianteAcademia>();
        for (const { aula, progreso } of porCurso) {
          for (const p of progreso) {
            const inscripcion = MOCK_INSCRIPCIONES.find((i) => i.usuarioId === p.estudianteId);
            const e = mapa.get(p.estudianteId) ?? { usuarioId: p.estudianteId, nombre: p.nombre, gmail: inscripcion?.usuarioGmail ?? '', cursos: [] };
            e.cursos.push({ aulaId: aula.id, nombre: aula.nombre, progreso: p.porcentaje });
            mapa.set(p.estudianteId, e);
          }
        }
        return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
      })
    );
  }

  // ---------- Interno ----------
  private cursosDe(espacioId: number, docenteId: number): Aula[] {
    return this.aulasRepo.ahora((a) => a.espacioId === espacioId && a.tipo === 'curso' && a.docenteId === docenteId);
  }

  private publico(aula: Aula, usuarioId: number | null): CursoPublico {
    const unidades = MOCK_UNIDADES.filter((u) => u.aulaId === aula.id && u.publicada);
    const ids = new Set(unidades.map((u) => u.id));
    const inscripciones = MOCK_INSCRIPCIONES.filter((i) => i.cursoId === cursoIdDe(aula.id));
    const mia = usuarioId ? inscripciones.find((i) => i.usuarioId === usuarioId && i.estadoInscripcion !== 'BAJA') : undefined;
    return {
      aula: structuredClone(aula),
      docente: MOCK_DOCENTES.find((d) => d.id === aula.docenteId)?.nombre ?? 'Docente',
      unidades: unidades.length,
      temas: MOCK_TEMAS_AULA.filter((t) => ids.has(t.unidadId) && t.publicado).length,
      estudiantes: inscripciones.filter((i) => i.estadoInscripcion === 'ACTIVA').length,
      estado: (mia?.estadoInscripcion as EstadoInscripcion | undefined) ?? 'ninguna',
    };
  }

  private validar(d: DatosCurso): string | null {
    if (!d.nombre.trim()) return 'Ponle un nombre al curso.';
    if (d.nombre.trim().length > 80) return 'El nombre puede tener hasta 80 caracteres.';
    if (!d.categoria) return 'Elige una categoría.';
    if (d.portada.length > 800 * 1024 * 1.37) return 'La portada debe pesar menos de 800 KB.';
    return null;
  }

  private nuevoCodigo(nombre: string): string {
    const prefijo = (nombre.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3) || 'CUR').toUpperCase();
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = '';
    do {
      codigo = `${prefijo}-${Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join('')}`;
    } while (this.aulasRepo.ahora((a) => a.codigo === codigo).length);
    return codigo;
  }
}
