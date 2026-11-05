import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import type { Aula, Progreso, Tema, Unidad } from '../core/models/classrooms.model';
import { NIVELES, TURNOS, paraleloLabel } from '../core/models/academics.model';
import { hoyIso } from '../core/utils/attendance';
import { boletinDe, indiceNotas, periodoDeFecha } from '../core/utils/grades';
import { porcentaje } from '../core/utils/reports';
import { ahoraIso } from '../core/utils/assignments';
import { MOCK_DOCENTES, MOCK_PARALELOS } from '../mocks/academics.mock';
import { MOCK_AULAS_VIRTUALES, MOCK_PROGRESO, MOCK_TEMAS_AULA, MOCK_UNIDADES, estudiantesDeAula } from '../mocks/classrooms.mock';
import { MOCK_ESTUDIANTES } from '../mocks/attendance.mock';
import { MOCK_DELAY, MOCK_INSCRIPCIONES } from '../mocks/mock-data';
import { GradesService } from './grades.service';
import { MockRepository } from './mock-repository';
import { QuizService } from './quiz.service';
import { AssignmentsService } from './assignments.service';

export interface Anillo {
  label: string;
  valor: number | null; // porcentaje (null = sin datos)
}

// Aula con lo que muestran las tarjetas de la lista
export interface AulaResumen extends Aula {
  curso: string; // "3ro A · Secundaria" o la categoría del curso
  docente: string;
  estudiantes: number;
  unidades: number;
  temas: number;
  tareas: number;
  quiz: number;
  pendientes: number; // docente: entregas por revisar · estudiante: tareas por entregar
  chips: string[];
  anillos: [Anillo, Anillo];
}

export interface UnidadConTemas extends Unidad {
  temas: Tema[];
}

export const PORTADA_MAX_KB = 800;

// Aulas virtuales (clases del colegio y cursos de academia) y su contenido: unidades, temas y progreso.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class ClassroomsService {
  private tareasService = inject(AssignmentsService);
  private calificaciones = inject(GradesService);
  private quizService = inject(QuizService);

  private aulasRepo = new MockRepository<Aula>(MOCK_AULAS_VIRTUALES);
  private unidadesRepo = new MockRepository<Unidad>(MOCK_UNIDADES);
  private temasRepo = new MockRepository<Tema>(MOCK_TEMAS_AULA);
  private progresoRepo = new MockRepository<Progreso>(MOCK_PROGRESO);

  // ---------- Listas ----------
  aulasDocente(espacioId: number, docenteId: number): Observable<AulaResumen[]> {
    const aulas = this.aulasRepo.readNow((a) => a.espacioId === espacioId && a.docenteId === docenteId);
    return this.tareasService.tareasDocente(espacioId, docenteId).pipe(
      map((tareas) =>
        aulas.map((aula) => {
          const propias = tareas.filter((t) => t.aulaId === aula.id);
          const esperadas = propias.reduce((s, t) => s + t.estudiantes, 0);
          return this.resumen(aula, {
            pendientes: propias.reduce((s, t) => s + t.porRevisar, 0),
            tareas: propias.length,
            anillos: [
              { label: 'Avance del grupo', valor: this.avanceGrupo(aula) },
              { label: 'Entregas', valor: esperadas ? porcentaje(propias.reduce((s, t) => s + t.entregadas, 0), esperadas) : null },
            ],
          });
        }).sort((a, b) => b.actualizado.localeCompare(a.actualizado))
      )
    );
  }

  aulasEstudiante(espacioId: number, estudianteId: number): Observable<AulaResumen[]> {
    const aulas = this.aulasRepo.readNow((a) => a.espacioId === espacioId && estudiantesDeAula(a).includes(estudianteId));
    const paraleloId = aulas.find((a) => a.tipo === 'clase')?.paraleloId ?? 0;
    return forkJoin({
      tareas: this.tareasService.tareasDeEstudiante(espacioId, estudianteId),
      datos: paraleloId ? this.calificaciones.getClassGroupData(espacioId, paraleloId) : of(null),
    }).pipe(
      map(({ tareas, datos }) => {
        const indice = datos ? periodoDeFecha(datos.gestion, hoyIso()) : 0;
        const notas = datos ? boletinDe(datos, indiceNotas(datos.notas), estudianteId) : [];
        return aulas.map((aula) => {
          const propias = tareas.filter((t) => t.tarea.aulaId === aula.id);
          const nota = notas.find((f) => f.materia.id === aula.materiaId)?.periodos[indice] ?? null;
          return this.resumen(aula, {
            pendientes: propias.filter((t) => t.estado === 'pendiente' || t.estado === 'no-entregada').length,
            tareas: propias.length,
            anillos: [
              { label: 'Mi progreso', valor: this.avanceEstudiante(aula, estudianteId) },
              aula.tipo === 'clase'
                ? { label: 'Mi nota', valor: nota !== null && datos ? Math.round((nota / datos.config.notaMaxima) * 100) : null }
                : { label: 'Tareas al día', valor: propias.length ? porcentaje(propias.filter((t) => t.entrega?.entregadaEl).length, propias.length) : null },
            ],
          });
        }).sort((a, b) => a.nombre.localeCompare(b.nombre));
      })
    );
  }

  aula(aulaId: number): Observable<AulaResumen | null> {
    const aula = this.aulasRepo.readNow((a) => a.id === aulaId)[0];
    return of(aula ? this.resumen(aula, { pendientes: 0, tareas: 0, anillos: [{ label: '', valor: null }, { label: '', valor: null }] }) : null).pipe(delay(MOCK_DELAY));
  }

  // Portada propia o vuelta a la ilustración por defecto ('')
  cambiarPortada(aulaId: number, portada: string): Observable<Aula> {
    const aula = this.aulasRepo.readNow((a) => a.id === aulaId)[0];
    if (!aula) return throwError(() => new Error('El aula ya no existe.'));
    if (portada.length > PORTADA_MAX_KB * 1024 * 1.37) return throwError(() => new Error(`La imagen debe pesar menos de ${PORTADA_MAX_KB} KB.`));
    return this.aulasRepo.save({ ...aula, portada });
  }

  // ---------- Contenido ----------
  contenido(aulaId: number, soloPublicado = false): Observable<UnidadConTemas[]> {
    const unidades = this.unidadesRepo
      .readNow((u) => u.aulaId === aulaId && (!soloPublicado || u.publicada))
      .sort((a, b) => a.orden - b.orden)
      .map((u) => ({
        ...structuredClone(u),
        temas: this.temasRepo.readNow((t) => t.unidadId === u.id && (!soloPublicado || t.publicado)).sort((a, b) => a.orden - b.orden).map((t) => structuredClone(t)),
      }));
    return of(unidades).pipe(delay(MOCK_DELAY));
  }

  progresoDe(aulaId: number, estudianteId: number): Observable<Set<number>> {
    const temas = new Set(this.temasDeAula(aulaId).map((t) => t.id));
    return of(new Set(this.progresoRepo.readNow((p) => p.estudianteId === estudianteId && temas.has(p.temaId)).map((p) => p.temaId))).pipe(delay(MOCK_DELAY));
  }

  // Porcentaje de temas publicados que vio cada estudiante del aula
  progresoGrupo(aulaId: number): Observable<{ estudianteId: number; nombre: string; porcentaje: number }[]> {
    const aula = this.aulasRepo.readNow((a) => a.id === aulaId)[0];
    const temas = new Set(this.temasDeAula(aulaId, true).map((t) => t.id));
    const nombre = (id: number) => MOCK_ESTUDIANTES.find((e) => e.id === id)?.nombre ?? MOCK_INSCRIPCIONES.find((i) => i.usuarioId === id)?.usuarioNombre ?? `Estudiante ${id}`;
    const lista = (aula ? estudiantesDeAula(aula) : []).map((id) => ({
      estudianteId: id,
      nombre: nombre(id),
      porcentaje: porcentaje(this.progresoRepo.readNow((p) => p.estudianteId === id && temas.has(p.temaId)).length, temas.size),
    }));
    return of(lista.sort((a, b) => a.nombre.localeCompare(b.nombre))).pipe(delay(MOCK_DELAY));
  }

  marcarVisto(temaId: number, estudianteId: number): Observable<Progreso> {
    const previo = this.progresoRepo.readNow((p) => p.temaId === temaId && p.estudianteId === estudianteId)[0];
    return previo ? of(structuredClone(previo)) : this.progresoRepo.save({ temaId, estudianteId, completadoEl: ahoraIso() });
  }

  guardarUnidad(unidad: Omit<Unidad, 'id' | 'orden'> & { id?: number }): Observable<Unidad> {
    if (!unidad.titulo.trim()) return throwError(() => new Error('Ponle un título a la unidad.'));
    const previa = unidad.id ? this.unidadesRepo.readNow((u) => u.id === unidad.id)[0] : undefined;
    const orden = previa?.orden ?? this.unidadesRepo.readNow((u) => u.aulaId === unidad.aulaId).length + 1;
    this.tocar(unidad.aulaId);
    return this.unidadesRepo.save({ ...unidad, titulo: unidad.titulo.trim(), orden });
  }

  eliminarUnidad(unidad: Unidad): Observable<void> {
    for (const t of this.temasRepo.readNow((x) => x.unidadId === unidad.id)) this.eliminarTemaYProgreso(t.id);
    this.unidadesRepo.delete(unidad.id);
    this.reordenar(this.unidadesRepo.readNow((u) => u.aulaId === unidad.aulaId));
    this.tocar(unidad.aulaId);
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  moverUnidad(unidad: Unidad, direccion: -1 | 1): Observable<void> {
    this.mover(this.unidadesRepo.readNow((u) => u.aulaId === unidad.aulaId), unidad.id, direccion);
    this.tocar(unidad.aulaId);
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  guardarTema(tema: Omit<Tema, 'id' | 'orden'> & { id?: number }): Observable<Tema> {
    if (!tema.titulo.trim()) return throwError(() => new Error('Ponle un título al tema.'));
    if (tema.tipo !== 'texto' && !tema.url.trim()) return throwError(() => new Error(tema.tipo === 'pdf' ? 'Adjunta el documento.' : 'Indica el enlace del recurso.'));
    const previo = tema.id ? this.temasRepo.readNow((t) => t.id === tema.id)[0] : undefined;
    const orden = previo?.unidadId === tema.unidadId ? previo.orden : this.temasRepo.readNow((t) => t.unidadId === tema.unidadId).length + 1;
    this.tocar(this.aulaDeUnidad(tema.unidadId));
    return this.temasRepo.save({ ...tema, titulo: tema.titulo.trim(), orden });
  }

  eliminarTema(tema: Tema): Observable<void> {
    this.eliminarTemaYProgreso(tema.id);
    this.reordenar(this.temasRepo.readNow((t) => t.unidadId === tema.unidadId));
    this.tocar(this.aulaDeUnidad(tema.unidadId));
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  moverTema(tema: Tema, direccion: -1 | 1): Observable<void> {
    this.mover(this.temasRepo.readNow((t) => t.unidadId === tema.unidadId), tema.id, direccion);
    this.tocar(this.aulaDeUnidad(tema.unidadId));
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // Aulas de la misma materia (otros paralelos) a las que el docente puede copiar el contenido
  aulasHermanas(aulaId: number): Observable<Aula[]> {
    const aula = this.aulasRepo.readNow((a) => a.id === aulaId)[0];
    if (!aula || aula.tipo !== 'clase') return of([]).pipe(delay(MOCK_DELAY));
    return this.aulasRepo.list((a) => a.id !== aula.id && a.tipo === 'clase' && a.docenteId === aula.docenteId && a.materiaId === aula.materiaId);
  }

  // Copia unidades y temas (como borrador) al final del contenido de otras aulas
  copiarContenido(origenId: number, unidadIds: number[], destinoIds: number[]): Observable<number> {
    if (!unidadIds.length || !destinoIds.length) return throwError(() => new Error('Elige qué unidades copiar y a qué paralelos.'));
    const unidades = this.unidadesRepo.readNow((u) => u.aulaId === origenId && unidadIds.includes(u.id)).sort((a, b) => a.orden - b.orden);
    for (const destino of destinoIds) {
      let orden = this.unidadesRepo.readNow((u) => u.aulaId === destino).length;
      for (const u of unidades) {
        this.unidadesRepo.save({ ...u, id: undefined, aulaId: destino, orden: ++orden, publicada: false }).subscribe((nueva) => {
          for (const t of this.temasRepo.readNow((x) => x.unidadId === u.id)) this.temasRepo.save({ ...t, id: undefined, unidadId: nueva.id });
        });
      }
      this.tocar(destino);
    }
    return of(unidades.length * destinoIds.length).pipe(delay(MOCK_DELAY * 2));
  }

  // ---------- Interno ----------
  private resumen(aula: Aula, extra: Pick<AulaResumen, 'pendientes' | 'tareas' | 'anillos'>): AulaResumen {
    const paralelo = MOCK_PARALELOS.find((p) => p.id === aula.paraleloId);
    const unidades = this.unidadesRepo.readNow((u) => u.aulaId === aula.id);
    const ids = new Set(unidades.map((u) => u.id));
    return {
      ...structuredClone(aula),
      ...extra,
      curso: paralelo ? `${paraleloLabel(paralelo)} · ${NIVELES.find((n) => n.id === paralelo.nivel)?.label}` : aula.categoria,
      docente: MOCK_DOCENTES.find((d) => d.id === aula.docenteId)?.nombre ?? '',
      estudiantes: estudiantesDeAula(aula).length,
      unidades: unidades.length,
      temas: this.temasRepo.readNow((t) => ids.has(t.unidadId)).length,
      quiz: this.quizService.publicados(aula.id),
      chips: paralelo
        ? [NIVELES.find((n) => n.id === paralelo.nivel)?.label ?? '', `Turno ${TURNOS.find((t) => t.id === paralelo.turno)?.label.toLowerCase()}`]
        : [aula.categoria, aula.nivel].filter(Boolean),
    };
  }

  private temasDeAula(aulaId: number, soloPublicado = false): Tema[] {
    const unidades = new Set(this.unidadesRepo.readNow((u) => u.aulaId === aulaId && (!soloPublicado || u.publicada)).map((u) => u.id));
    return this.temasRepo.readNow((t) => unidades.has(t.unidadId) && (!soloPublicado || t.publicado));
  }

  private avanceEstudiante(aula: Aula, estudianteId: number): number | null {
    const temas = this.temasDeAula(aula.id, true);
    if (!temas.length) return null;
    const ids = new Set(temas.map((t) => t.id));
    return porcentaje(this.progresoRepo.readNow((p) => p.estudianteId === estudianteId && ids.has(p.temaId)).length, temas.length);
  }

  private avanceGrupo(aula: Aula): number | null {
    const alumnos = estudiantesDeAula(aula);
    const temas = this.temasDeAula(aula.id, true);
    if (!alumnos.length || !temas.length) return null;
    const ids = new Set(temas.map((t) => t.id));
    const alumnosSet = new Set(alumnos);
    return porcentaje(this.progresoRepo.readNow((p) => ids.has(p.temaId) && alumnosSet.has(p.estudianteId)).length, temas.length * alumnos.length);
  }

  private aulaDeUnidad(unidadId: number): number {
    return this.unidadesRepo.readNow((u) => u.id === unidadId)[0]?.aulaId ?? 0;
  }

  private tocar(aulaId: number): void {
    const aula = this.aulasRepo.readNow((a) => a.id === aulaId)[0];
    if (aula) aula.actualizado = ahoraIso();
  }

  private eliminarTemaYProgreso(temaId: number): void {
    for (const p of this.progresoRepo.readNow((x) => x.temaId === temaId)) this.progresoRepo.delete(p.id);
    this.temasRepo.delete(temaId);
  }

  private reordenar(items: { orden: number }[]): void {
    [...items].sort((a, b) => a.orden - b.orden).forEach((x, i) => (x.orden = i + 1));
  }

  private mover(items: { id: number; orden: number }[], id: number, direccion: -1 | 1): void {
    const lista = [...items].sort((a, b) => a.orden - b.orden);
    const i = lista.findIndex((x) => x.id === id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= lista.length) return;
    [lista[i].orden, lista[j].orden] = [lista[j].orden, lista[i].orden];
  }
}
