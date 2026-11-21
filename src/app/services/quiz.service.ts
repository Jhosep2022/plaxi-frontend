import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import type { Intento, Pregunta, PreguntaParaResponder, Quiz, Respuesta } from '../core/models/quiz.model';

export interface QuizDocente extends Quiz {
  preguntas: number;
  puntajeMax: number;
  respondieron: number;
  estudiantes: number;
  precision: number | null; // % promedio de acierto (mejor intento de cada estudiante)
  completado: number | null; // % de estudiantes que lo respondieron
  cerrado: boolean;
  cuentaParaNota: boolean;
  criterio: string;
}

export type EstadoQuiz = 'pendiente' | 'en-curso' | 'realizado' | 'agotado' | 'cerrado';

export interface QuizEstudiante extends Omit<Quiz, 'actividadId'> {
  preguntas: number;
  intentosHechos: number;
  intentosRestantes: number | null; // null = ilimitados
  mejor: Intento | null;
  enCurso: { id: number; inicio: string } | null;
  estado: EstadoQuiz;
  cerrado: boolean;
  cuentaParaNota: boolean;
}

export interface ResultadosQuiz {
  quiz: QuizDocente;
  preguntas: (Pregunta & { acierto: number | null })[];
  estudiantes: { estudianteId: number; nombre: string; avatar: string | null; mejor: Intento | null; intentos: number; nota: number | null }[];
}

export interface NotasCurso {
  quizzes: { id: number; titulo: string; cierre: string; cerrado: boolean }[];
  estudiantes: { estudianteId: number; nombre: string; notas: Map<number, number>; promedio: number | null }[];
}

// Intento abierto por el servidor: trae las preguntas sin la respuesta correcta
export interface IntentoIniciado {
  intento: { id: number; inicio: string; expira: string | null }; // expira: null = sin límite de tiempo
  quiz: { id: number; titulo: string; descripcion: string; tiempoMin: number; cierre: string };
  preguntas: PreguntaParaResponder[];
}

export interface IntentoCorregido extends Intento {
  fueraDeTiempo: boolean; // llegó pasado el margen: se cerró sin contar las respuestas
  intentosRestantes: number | null;
  correctas: { preguntaId: number; respuesta: string }[] | null; // solo cuando ya no quedan intentos (o el quiz cerró)
  nota: { valor: number; guardada: boolean } | null; // null: el quiz no cuenta para la nota
}

export type BorradorQuiz = Omit<Quiz, 'id' | 'actividadId' | 'creado'> & { id?: number };
export type BorradorPregunta = Omit<Pregunta, 'id' | 'quizId' | 'orden'>;

interface EstudianteApi {
  usuarioId: number;
  nombre: string;
  avatar?: string;
}

// Quiz con corrección automática: los arma el docente, los responden los estudiantes y la nota puede ir a la planilla.
// El servidor corrige cada intento y lleva el mejor puntaje a la planilla; las respuestas correctas no llegan al estudiante.
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  // ---------- Docente ----------
  quizzesDocente(aulaId: number): Observable<QuizDocente[]> {
    return this.http.get<QuizDocente[]>(`${this.base}/aulas/${aulaId}/quiz`).pipe(map((l) => [...l].sort((a, b) => b.creado.localeCompare(a.creado))));
  }

  quizConPreguntas(quizId: number): Observable<{ quiz: Quiz & { criterio: string }; preguntas: Pregunta[] }> {
    return this.http.get<Quiz & { criterio: string; preguntas: Pregunta[] }>(`${this.base}/quiz/${quizId}`).pipe(map(({ preguntas, ...quiz }) => ({ quiz, preguntas })));
  }

  // Guarda el quiz y reemplaza sus preguntas; con un criterio, el servidor crea su actividad en la planilla
  guardar(borrador: BorradorQuiz, preguntas: BorradorPregunta[], criterioId: number): Observable<Quiz> {
    if (!borrador.titulo.trim()) return throwError(() => new Error('Ponle un título al quiz.'));
    if (borrador.publicado && !preguntas.length) return throwError(() => new Error('Agrega al menos una pregunta antes de publicar.'));
    const { id, aulaId, ...datos } = borrador;
    const cuerpo = {
      ...datos,
      titulo: datos.titulo.trim(),
      ...(criterioId ? { criterioId } : {}),
      preguntas: preguntas.map((p) => ({
        enunciado: p.enunciado.trim(),
        tipo: p.tipo,
        puntos: p.puntos,
        opciones: p.tipo === 'opcion' ? p.opciones.map((o) => o.trim()) : [],
        correcta: p.correcta,
        aceptadas: p.tipo === 'corta' ? p.aceptadas.map((a) => a.trim()).filter(Boolean) : [],
      })),
    };
    return id ? this.http.put<Quiz>(`${this.base}/quiz/${id}`, cuerpo) : this.http.post<Quiz>(`${this.base}/aulas/${aulaId}/quiz`, cuerpo);
  }

  cambiarPublicado(quizId: number, publicado: boolean): Observable<Quiz> {
    return this.http.post<Quiz>(`${this.base}/quiz/${quizId}/publicar`, { publicado });
  }

  eliminar(quizId: number): Observable<void> {
    return this.http.delete(`${this.base}/quiz/${quizId}`).pipe(map(() => undefined));
  }

  resultados(quizId: number): Observable<ResultadosQuiz> {
    return this.http
      .get<Omit<ResultadosQuiz, 'estudiantes'> & { estudiantes: (EstudianteApi & { intentos: number; mejor: Intento | null; nota: number | null })[] }>(`${this.base}/quiz/${quizId}/resultados`)
      .pipe(
        map((r) => ({
          ...r,
          estudiantes: r.estudiantes.map((e) => ({ estudianteId: e.usuarioId, nombre: e.nombre, avatar: e.avatar ?? null, mejor: e.mejor, intentos: e.intentos, nota: e.nota })),
        })),
      );
  }

  // ---------- Estudiante y padre ----------
  quizzesEstudiante(aulaId: number, hijoId?: number): Observable<QuizEstudiante[]> {
    const params: Record<string, number> = this.session.activeRole() === 'padre' && hijoId ? { hijo: hijoId } : {};
    return this.http
      .get<QuizEstudiante[]>(`${this.base}/aulas/${aulaId}/quiz`, { params })
      .pipe(map((l) => [...l].sort((a, b) => a.cierre.localeCompare(b.cierre))));
  }

  // Abre un intento (o retoma el que está en curso): el servidor guarda la hora de inicio
  iniciar(quizId: number): Observable<IntentoIniciado> {
    return this.http.post<IntentoIniciado>(`${this.base}/quiz/${quizId}/intentos`, {});
  }

  // Envía las respuestas; el servidor corrige y, si cuenta para la nota, lleva el mejor puntaje a la planilla
  enviar(intentoId: number, respuestas: { preguntaId: number; valor: Respuesta }[]): Observable<IntentoCorregido> {
    return this.http.put<IntentoCorregido>(`${this.base}/intentos/${intentoId}`, { respuestas });
  }

  // ---------- Notas de la academia (a partir de los quiz) ----------
  // Planilla del curso: mejor porcentaje de cada estudiante en cada quiz publicado
  notasCurso(aulaId: number): Observable<NotasCurso> {
    return this.http
      .get<{ quizzes: NotasCurso['quizzes']; estudiantes: (EstudianteApi & { notas: Record<number, number>; promedio: number | null })[] }>(`${this.base}/aulas/${aulaId}/notas`)
      .pipe(
        map((n) => ({
          quizzes: n.quizzes,
          estudiantes: n.estudiantes.map((e) => ({
            estudianteId: e.usuarioId,
            nombre: e.nombre,
            notas: new Map(Object.entries(e.notas).map(([id, nota]) => [Number(id), nota])),
            promedio: e.promedio,
          })),
        })),
      );
  }
}
