import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { esCorrecta } from '../core/models/quiz.model';
import type { Intento, Pregunta, Quiz, Respuesta } from '../core/models/quiz.model';
import { periodoDeFecha } from '../core/utils/calificaciones';
import { porcentaje } from '../core/utils/reportes';
import { ahoraIso } from '../core/utils/tareas';
import { MOCK_GESTIONES } from '../mocks/academico.mock';
import { MOCK_AULAS_VIRTUALES, estudiantesDeAula } from '../mocks/aulas.mock';
import { MOCK_ESTUDIANTES } from '../mocks/asistencia.mock';
import { MOCK_DELAY, MOCK_INSCRIPCIONES } from '../mocks/mock-data';
import { MOCK_INTENTOS, MOCK_PREGUNTAS, MOCK_QUIZZES } from '../mocks/quiz.mock';
import { CalificacionesService } from './calificaciones.service';
import { RepositorioMock } from './repositorio-mock';

export interface QuizDocente extends Quiz {
  preguntas: number;
  puntajeMax: number;
  respondieron: number;
  estudiantes: number;
  precision: number | null; // % promedio de acierto (mejor intento de cada estudiante)
  completado: number | null; // % de estudiantes que lo respondieron
  cerrado: boolean;
  cuentaParaNota: boolean;
}

export type EstadoQuiz = 'pendiente' | 'realizado' | 'cerrado' | 'agotado';

export interface QuizEstudiante extends Quiz {
  preguntas: number;
  intentosHechos: number;
  mejor: Intento | null;
  estado: EstadoQuiz;
  cerrado: boolean;
}

export interface ResultadosQuiz {
  quiz: QuizDocente;
  preguntas: (Pregunta & { acierto: number | null })[];
  estudiantes: { estudianteId: number; nombre: string; mejor: Intento | null; intentos: number }[];
}

export interface NotasCurso {
  quizzes: (Quiz & { cerrado: boolean })[];
  estudiantes: { estudianteId: number; nombre: string; notas: Map<number, number>; promedio: number | null }[];
}

export type BorradorQuiz =Omit<Quiz, 'id' | 'actividadId' | 'creado'> & { id?: number };
export type BorradorPregunta = Omit<Pregunta, 'id' | 'quizId' | 'orden'>;

const limite = (q: Pick<Quiz, 'cierre' | 'horaCierre'>) => `${q.cierre}T${q.horaCierre}`;

// Quiz con corrección automática: los arma el docente, los responden los estudiantes y la nota puede ir a la planilla.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class QuizService {
  private calificaciones = inject(CalificacionesService);
  private quizRepo = new RepositorioMock<Quiz>(MOCK_QUIZZES);
  private preguntasRepo = new RepositorioMock<Pregunta>(MOCK_PREGUNTAS);
  private intentosRepo = new RepositorioMock<Intento>(MOCK_INTENTOS);

  // Para las tarjetas del aula
  publicados(aulaId: number): number {
    return this.quizRepo.ahora((q) => q.aulaId === aulaId && q.publicado).length;
  }

  // ---------- Docente ----------
  quizzesDocente(aulaId: number): Observable<QuizDocente[]> {
    const lista = this.quizRepo.ahora((q) => q.aulaId === aulaId).map((q) => this.resumenDocente(q)).sort((a, b) => b.creado.localeCompare(a.creado));
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  quizConPreguntas(quizId: number): Observable<{ quiz: Quiz; preguntas: Pregunta[] } | null> {
    const quiz = this.quizRepo.ahora((q) => q.id === quizId)[0];
    return of(quiz ? { quiz: structuredClone(quiz), preguntas: this.preguntasDe(quizId).map((p) => structuredClone(p)) } : null).pipe(delay(MOCK_DELAY));
  }

  // Guarda el quiz y reemplaza sus preguntas; si se indica un criterio, crea su actividad en la planilla
  guardar(espacioId: number, docenteId: number, borrador: BorradorQuiz, preguntas: BorradorPregunta[], criterioId: number): Observable<Quiz> {
    return from(this.guardarAsync(espacioId, docenteId, borrador, preguntas, criterioId));
  }

  private async guardarAsync(espacioId: number, docenteId: number, b: BorradorQuiz, preguntas: BorradorPregunta[], criterioId: number): Promise<Quiz> {
    if (!b.titulo.trim()) throw new Error('Ponle un título al quiz.');
    if (b.publicado && !preguntas.length) throw new Error('Agrega al menos una pregunta antes de publicar.');
    preguntas.forEach((p, i) => {
      if (!p.enunciado.trim()) throw new Error(`La pregunta ${i + 1} no tiene enunciado.`);
      if (p.tipo === 'opcion' && p.opciones.filter((o) => o.trim()).length < 2) throw new Error(`La pregunta ${i + 1} necesita al menos 2 opciones.`);
      if (p.tipo === 'opcion' && !p.opciones[p.correcta]?.trim()) throw new Error(`Marca la opción correcta de la pregunta ${i + 1}.`);
      if (p.tipo === 'corta' && !p.aceptadas.some((a) => a.trim())) throw new Error(`Indica la respuesta correcta de la pregunta ${i + 1}.`);
    });
    if (b.id && this.intentosRepo.ahora((x) => x.quizId === b.id).length && preguntas.length !== this.preguntasDe(b.id).length) {
      throw new Error('Este quiz ya tiene respuestas: no se pueden agregar ni quitar preguntas.');
    }

    const previo = b.id ? this.quizRepo.ahora((q) => q.id === b.id)[0] : undefined;
    let actividadId = previo?.actividadId ?? 0;
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === b.aulaId);
    if (criterioId && !actividadId && aula?.tipo === 'clase') {
      const gestion = MOCK_GESTIONES.find((g) => g.espacioId === espacioId && g.estado === 'activa');
      if (!gestion) throw new Error('No hay una gestión activa.');
      const actividad = await firstValueFrom(this.calificaciones.guardarActividad({
        espacioId, gestionId: gestion.id, periodo: periodoDeFecha(gestion, b.cierre), paraleloId: aula.paraleloId, materiaId: aula.materiaId,
        criterioId, nombre: b.titulo.trim(), fecha: b.cierre, docenteId,
      }));
      actividadId = actividad.id;
    }
    const quiz = await firstValueFrom(this.quizRepo.guardar({ ...b, titulo: b.titulo.trim(), actividadId, creado: previo?.creado ?? ahoraIso() }));
    for (const p of this.preguntasRepo.ahora((x) => x.quizId === quiz.id)) this.preguntasRepo.eliminar(p.id);
    preguntas.forEach((p, i) => this.preguntasRepo.guardar({
      ...p, quizId: quiz.id, orden: i + 1, enunciado: p.enunciado.trim(),
      opciones: p.tipo === 'opcion' ? p.opciones.map((o) => o.trim()) : [], aceptadas: p.tipo === 'corta' ? p.aceptadas.map((a) => a.trim()).filter(Boolean) : [],
    }));
    return quiz;
  }

  cambiarPublicado(quizId: number, publicado: boolean): Observable<Quiz> {
    const quiz = this.quizRepo.ahora((q) => q.id === quizId)[0];
    if (!quiz) return throwError(() => new Error('El quiz ya no existe.'));
    if (publicado && !this.preguntasDe(quizId).length) return throwError(() => new Error('Agrega al menos una pregunta antes de publicar.'));
    return this.quizRepo.guardar({ ...quiz, publicado });
  }

  eliminar(quizId: number): Observable<void> {
    for (const p of this.preguntasRepo.ahora((x) => x.quizId === quizId)) this.preguntasRepo.eliminar(p.id);
    for (const i of this.intentosRepo.ahora((x) => x.quizId === quizId)) this.intentosRepo.eliminar(i.id);
    return this.quizRepo.eliminar(quizId);
  }

  resultados(quizId: number): Observable<ResultadosQuiz | null> {
    const quiz = this.quizRepo.ahora((q) => q.id === quizId)[0];
    if (!quiz) return of(null).pipe(delay(MOCK_DELAY));
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === quiz.aulaId);
    const intentos = this.intentosRepo.ahora((x) => x.quizId === quizId);
    const mejores = this.mejoresIntentos(intentos);
    const nombre = (id: number) => MOCK_ESTUDIANTES.find((e) => e.id === id)?.nombre ?? MOCK_INSCRIPCIONES.find((i) => i.usuarioId === id)?.usuarioNombre ?? `Estudiante ${id}`;
    return of({
      quiz: this.resumenDocente(quiz),
      preguntas: this.preguntasDe(quizId).map((p) => {
        const respuestas = mejores.map((m) => m.respuestas.find((r) => r.preguntaId === p.id)).filter((r) => !!r);
        return { ...structuredClone(p), acierto: respuestas.length ? porcentaje(respuestas.filter((r) => r.correcta).length, respuestas.length) : null };
      }),
      estudiantes: (aula ? estudiantesDeAula(aula) : [])
        .map((id) => ({ estudianteId: id, nombre: nombre(id), mejor: structuredClone(mejores.find((m) => m.estudianteId === id) ?? null), intentos: intentos.filter((x) => x.estudianteId === id).length }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }).pipe(delay(MOCK_DELAY));
  }

  // ---------- Estudiante ----------
  quizzesEstudiante(aulaId: number, estudianteId: number): Observable<QuizEstudiante[]> {
    const lista = this.quizRepo.ahora((q) => q.aulaId === aulaId && q.publicado).map((q) => {
      const intentos = this.intentosRepo.ahora((x) => x.quizId === q.id && x.estudianteId === estudianteId);
      const mejor = this.mejoresIntentos(intentos)[0] ?? null;
      const cerrado = ahoraIso() > limite(q);
      const estado: EstadoQuiz = cerrado ? 'cerrado' : intentos.length >= q.intentos ? 'agotado' : intentos.length ? 'realizado' : 'pendiente';
      return { ...structuredClone(q), preguntas: this.preguntasDe(q.id).length, intentosHechos: intentos.length, mejor: structuredClone(mejor), estado, cerrado };
    });
    return of(lista.sort((a, b) => a.cierre.localeCompare(b.cierre))).pipe(delay(MOCK_DELAY));
  }

  // Corrige y guarda un intento; si el quiz cuenta para la nota, lleva el mejor puntaje a la planilla
  enviar(espacioId: number, quizId: number, estudianteId: number, inicio: string, respuestas: { preguntaId: number; valor: Respuesta }[]): Observable<Intento> {
    return from(this.enviarAsync(espacioId, quizId, estudianteId, inicio, respuestas));
  }

  private async enviarAsync(espacioId: number, quizId: number, estudianteId: number, inicio: string, respuestas: { preguntaId: number; valor: Respuesta }[]): Promise<Intento> {
    const quiz = this.quizRepo.ahora((q) => q.id === quizId)[0];
    if (!quiz?.publicado) throw new Error('El quiz no está disponible.');
    if (ahoraIso() > limite(quiz)) throw new Error('El quiz ya cerró.');
    const hechos = this.intentosRepo.ahora((x) => x.quizId === quizId && x.estudianteId === estudianteId).length;
    if (hechos >= quiz.intentos) throw new Error('Ya usaste todos tus intentos.');
    const preguntas = this.preguntasDe(quizId);
    const corregidas = preguntas.map((p) => {
      const valor = respuestas.find((r) => r.preguntaId === p.id)?.valor ?? null;
      return { preguntaId: p.id, valor, correcta: esCorrecta(p, valor) };
    });
    const intento = await firstValueFrom(this.intentosRepo.guardar({
      quizId, estudianteId, inicio, fin: ahoraIso(), respuestas: corregidas,
      puntaje: preguntas.reduce((s, p, i) => s + (corregidas[i].correcta ? p.puntos : 0), 0),
      puntajeMax: preguntas.reduce((s, p) => s + p.puntos, 0),
    }));
    if (quiz.actividadId) {
      const mejor = this.mejoresIntentos(this.intentosRepo.ahora((x) => x.quizId === quizId && x.estudianteId === estudianteId))[0];
      const config = await firstValueFrom(this.calificaciones.config(espacioId));
      const nota = Math.round((mejor.puntaje / Math.max(1, mejor.puntajeMax)) * config.notaMaxima);
      try {
        await firstValueFrom(this.calificaciones.guardarNotas(espacioId, [{ actividadId: quiz.actividadId, estudianteId, valor: nota }]));
      } catch {
        // Periodo cerrado: el intento queda registrado pero la nota ya no cambia
      }
    }
    return intento;
  }

  // ---------- Notas de la academia (a partir de los quiz) ----------
  // Planilla del curso: mejor porcentaje de cada estudiante en cada quiz publicado
  notasCurso(aulaId: number): Observable<NotasCurso> {
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === aulaId);
    const quizzes = this.quizRepo.ahora((q) => q.aulaId === aulaId && q.publicado).sort((a, b) => a.cierre.localeCompare(b.cierre));
    const nombre = (id: number) => MOCK_INSCRIPCIONES.find((i) => i.usuarioId === id)?.usuarioNombre ?? MOCK_ESTUDIANTES.find((e) => e.id === id)?.nombre ?? `Estudiante ${id}`;
    const estudiantes = (aula ? estudiantesDeAula(aula) : []).map((id) => {
      const notas = new Map<number, number>();
      for (const q of quizzes) {
        const mejor = this.mejoresIntentos(this.intentosRepo.ahora((x) => x.quizId === q.id && x.estudianteId === id))[0];
        if (mejor) notas.set(q.id, porcentaje(mejor.puntaje, mejor.puntajeMax));
      }
      // Promedio sobre los quiz ya cerrados (los no respondidos cuentan 0) y los abiertos que ya respondió
      const computables = quizzes.filter((q) => notas.has(q.id) || ahoraIso() > limite(q));
      const promedio = computables.length ? Math.round(computables.reduce((s, q) => s + (notas.get(q.id) ?? 0), 0) / computables.length) : null;
      return { estudianteId: id, nombre: nombre(id), notas, promedio };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
    return of({ quizzes: quizzes.map((q) => ({ ...structuredClone(q), cerrado: ahoraIso() > limite(q) })), estudiantes }).pipe(delay(MOCK_DELAY));
  }

  // ---------- Interno ----------
  private preguntasDe(quizId: number): Pregunta[] {
    return this.preguntasRepo.ahora((p) => p.quizId === quizId).sort((a, b) => a.orden - b.orden);
  }

  // Mejor intento de cada estudiante (de mayor a menor puntaje)
  private mejoresIntentos(intentos: Intento[]): Intento[] {
    const mejores = new Map<number, Intento>();
    for (const i of intentos) {
      const previo = mejores.get(i.estudianteId);
      if (!previo || i.puntaje / i.puntajeMax > previo.puntaje / previo.puntajeMax) mejores.set(i.estudianteId, i);
    }
    return [...mejores.values()].sort((a, b) => b.puntaje / b.puntajeMax - a.puntaje / a.puntajeMax);
  }

  private resumenDocente(q: Quiz): QuizDocente {
    const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === q.aulaId);
    const preguntas = this.preguntasDe(q.id);
    const mejores = this.mejoresIntentos(this.intentosRepo.ahora((x) => x.quizId === q.id));
    const estudiantes = aula ? estudiantesDeAula(aula).length : 0;
    return {
      ...structuredClone(q),
      preguntas: preguntas.length,
      puntajeMax: preguntas.reduce((s, p) => s + p.puntos, 0),
      respondieron: mejores.length,
      estudiantes,
      precision: mejores.length ? Math.round(mejores.reduce((s, m) => s + m.puntaje / m.puntajeMax, 0) / mejores.length * 100) : null,
      completado: q.publicado && estudiantes ? porcentaje(mejores.length, estudiantes) : null,
      cerrado: ahoraIso() > limite(q),
      cuentaParaNota: !!q.actividadId,
    };
  }
}
