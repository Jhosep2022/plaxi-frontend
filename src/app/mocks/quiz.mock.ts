// ============================================================================
// DATOS MOCKEADOS de Quiz (aulas de María en 3ro A)
// ============================================================================
import { esCorrecta } from '../core/models/quiz.model';
import type { Intento, Pregunta, Quiz } from '../core/models/quiz.model';
import { MOCK_ESTUDIANTES } from './asistencia.mock';

// Aula 9 = Física · 3ro A, aula 8 = Matemáticas · 3ro A
export const MOCK_QUIZZES: Quiz[] = [
  { id: 1, aulaId: 9, titulo: 'Quiz: MRU y MRUV', descripcion: 'Repaso de la unidad 1 antes del examen.', tiempoMin: 15, intentos: 2, cierre: '2026-10-15', horaCierre: '23:59', mezclar: true, mostrarRespuestas: true, publicado: true, actividadId: 0, creado: '2026-10-09T10:00:00' },
  { id: 2, aulaId: 9, titulo: 'Quiz: Leyes de Newton', descripcion: 'Comprueba lo que aprendiste de la unidad 2.', tiempoMin: 10, intentos: 1, cierre: '2026-10-23', horaCierre: '23:59', mezclar: false, mostrarRespuestas: true, publicado: true, actividadId: 0, creado: '2026-10-16T09:00:00' },
  { id: 3, aulaId: 9, titulo: 'Repaso: trabajo y energía', descripcion: '', tiempoMin: 0, intentos: 3, cierre: '2026-11-06', horaCierre: '23:59', mezclar: false, mostrarRespuestas: true, publicado: false, actividadId: 0, creado: '2026-10-18T18:00:00' },
  { id: 4, aulaId: 8, titulo: 'Quiz: función lineal', descripcion: 'Pendiente, ordenada al origen y gráficas.', tiempoMin: 12, intentos: 2, cierre: '2026-10-22', horaCierre: '23:59', mezclar: false, mostrarRespuestas: true, publicado: true, actividadId: 0, creado: '2026-10-14T08:00:00' },
  // Academia: Angular desde cero (1001) y Fundamentos de UI/UX (1003)
  { id: 5, aulaId: 1001, titulo: 'Quiz: fundamentos de Angular', descripcion: 'Lo básico de la primera semana.', tiempoMin: 10, intentos: 2, cierre: '2026-10-12', horaCierre: '23:59', mezclar: false, mostrarRespuestas: true, publicado: true, actividadId: 0, creado: '2026-10-06T12:00:00' },
  { id: 6, aulaId: 1001, titulo: 'Quiz: componentes', descripcion: 'Comunicación entre componentes.', tiempoMin: 8, intentos: 2, cierre: '2026-10-26', horaCierre: '23:59', mezclar: false, mostrarRespuestas: true, publicado: true, actividadId: 0, creado: '2026-10-13T12:00:00' },
  { id: 7, aulaId: 1003, titulo: 'Quiz: principios de diseño', descripcion: '', tiempoMin: 0, intentos: 3, cierre: '2026-10-20', horaCierre: '23:59', mezclar: false, mostrarRespuestas: true, publicado: true, actividadId: 0, creado: '2026-10-15T19:30:00' },
];

let idPregunta = 0;
const op = (quizId: number, enunciado: string, opciones: string[], correcta: number, puntos = 1): Pregunta =>
  ({ id: ++idPregunta, quizId, enunciado, tipo: 'opcion', opciones, correcta, aceptadas: [], puntos, orden: 0 });
const vf = (quizId: number, enunciado: string, verdadero: boolean, puntos = 1): Pregunta =>
  ({ id: ++idPregunta, quizId, enunciado, tipo: 'vf', opciones: [], correcta: verdadero ? 0 : 1, aceptadas: [], puntos, orden: 0 });
const corta = (quizId: number, enunciado: string, aceptadas: string[], puntos = 1): Pregunta =>
  ({ id: ++idPregunta, quizId, enunciado, tipo: 'corta', opciones: [], correcta: 0, aceptadas, puntos, orden: 0 });

export const MOCK_PREGUNTAS: Pregunta[] = [
  op(1, 'En el MRU, la velocidad…', ['Aumenta de forma constante', 'Se mantiene constante', 'Disminuye', 'Es cero'], 1),
  op(1, 'Un auto recorre 120 km en 2 horas a velocidad constante. ¿Cuál es su velocidad?', ['40 km/h', '60 km/h', '120 km/h', '240 km/h'], 1),
  vf(1, 'En el MRUV la aceleración es constante.', true),
  op(1, '¿Qué fórmula corresponde a la velocidad final en el MRUV?', ['v = d / t', 'vf = vo + a·t', 'd = v·t', 'a = d / t²'], 1),
  corta(1, '¿Cómo se llama el movimiento de un cuerpo que cae sin resistencia del aire?', ['caída libre', 'caida libre']),
  vf(2, 'Un cuerpo en reposo permanece en reposo si no actúa una fuerza neta sobre él.', true),
  op(2, 'La segunda ley de Newton se expresa como…', ['F = m·a', 'F = m / a', 'E = m·c²', 'P = m·g·h'], 0, 2),
  op(2, 'Si empujas una pared, la pared te empuja con una fuerza…', ['Menor', 'Igual y opuesta', 'Mayor', 'Nula'], 1),
  corta(2, '¿En qué unidad se mide la fuerza en el Sistema Internacional?', ['newton', 'newtons', 'n']),
  op(3, 'La energía cinética depende de…', ['La altura', 'La masa y la velocidad', 'Solo la masa', 'La temperatura'], 1),
  vf(3, 'La energía se crea y se destruye.', false),
  op(4, 'En y = 2x + 3, la pendiente es…', ['3', '2', '5', '-2'], 1),
  op(4, 'En y = 2x + 3, la ordenada al origen es…', ['2', '0', '3', '-3'], 2),
  vf(4, 'Una función lineal con pendiente negativa es decreciente.', true),
  corta(4, 'Si m = 0, ¿cómo es la gráfica de la función? (una palabra)', ['horizontal', 'constante']),
  op(4, '¿Qué punto pertenece a y = x + 1?', ['(1, 3)', '(2, 3)', '(0, 0)', '(3, 1)'], 1),
  op(5, '¿Con qué comando se crea un proyecto nuevo de Angular?', ['npm start', 'ng new', 'ng serve', 'npm init'], 1),
  vf(5, 'Angular usa TypeScript.', true),
  op(5, '¿Qué archivo define las rutas de la aplicación?', ['main.ts', 'app.routes.ts', 'styles.css', 'index.html'], 1),
  corta(5, '¿Qué comando levanta el servidor de desarrollo? (dos palabras)', ['ng serve']),
  op(6, '¿Con qué función se declara una entrada en un componente moderno?', ['input()', 'output()', 'signal()', 'effect()'], 0),
  vf(6, 'output() sirve para emitir eventos al componente padre.', true),
  op(6, '¿Qué se usa para leer el valor de una signal?', ['.value', 'Llamarla como función', '.get()', 'subscribe()'], 1),
  op(7, 'La jerarquía visual sirve para…', ['Decorar', 'Guiar la atención del usuario', 'Usar más colores', 'Llenar espacios'], 1),
  vf(7, 'Un buen contraste mejora la legibilidad.', true),
  corta(7, '¿Cómo se llama el espacio vacío entre elementos? (en inglés)', ['whitespace', 'white space']),
].map((p, _i, todas) => ({ ...p, orden: todas.filter((x) => x.quizId === p.quizId).indexOf(p) + 1 })); // orden dentro de cada quiz

function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// Quién respondió cada quiz y con qué acierto aproximado
const PLAN: Record<number, { responden: number; fecha: string }> = {
  1: { responden: 0.9, fecha: '2026-10-13' },
  2: { responden: 0.3, fecha: '2026-10-18' },
  4: { responden: 0.6, fecha: '2026-10-16' },
};
// Historia fija de Luis: hizo el de MRU (4 de 5) y el de función lineal; le falta el de Newton
const LUIS: Record<number, number[] | null> = { 1: [1, 1, 0, 1, 1], 2: null, 4: [1, 1, 1, 0, 1] };

let idIntento = 0;
const COLEGIO: Intento[] = Object.entries(PLAN).flatMap(([q, plan]) => {
  const quizId = Number(q);
  const quiz = MOCK_QUIZZES.find((x) => x.id === quizId)!;
  const paraleloId = quiz.aulaId === 9 || quiz.aulaId === 8 ? 5 : 0;
  const preguntas = MOCK_PREGUNTAS.filter((p) => p.quizId === quizId);
  return MOCK_ESTUDIANTES.filter((e) => e.paraleloId === paraleloId).flatMap((e): Intento[] => {
    const esLuis = e.id === 2;
    if (esLuis ? !LUIS[quizId] : azar(`q${quizId}-${e.id}`) >= plan.responden) return [];
    const habilidad = 0.45 + azar(`hab-${e.id}`) * 0.55;
    const respuestas = preguntas.map((p, i) => {
      const acierta = esLuis ? LUIS[quizId]![i] === 1 : azar(`r${p.id}-${e.id}`) < habilidad;
      const valor = acierta
        ? (p.tipo === 'corta' ? p.aceptadas[0] : p.correcta)
        : (p.tipo === 'corta' ? 'no sé' : p.tipo === 'vf' ? 1 - p.correcta : (p.correcta + 1) % p.opciones.length);
      return { preguntaId: p.id, valor, correcta: esCorrecta(p, valor) };
    });
    const puntaje = preguntas.reduce((s, p, i) => s + (respuestas[i].correcta ? p.puntos : 0), 0);
    const minuto = String(10 + Math.floor(azar(`m-${e.id}`) * 40)).padStart(2, '0');
    return [{
      id: ++idIntento, quizId, estudianteId: e.id, inicio: `${plan.fecha}T19:${minuto}:00`, fin: `${plan.fecha}T19:${String(Number(minuto) + 8).padStart(2, '0')}:00`,
      respuestas, puntaje, puntajeMax: preguntas.reduce((s, p) => s + p.puntos, 0),
    }];
  });
});

// Academia: aciertos por pregunta de cada estudiante (1 = correcta)
const ACADEMIA: Record<number, Record<number, number[]>> = {
  5: { 2: [1, 1, 0, 1], 4: [1, 1, 1, 1] }, // Luis 3/4, Carla 4/4
  6: { 4: [1, 0, 1] }, // Carla 2/3 (Luis todavía no lo hizo)
  7: { 2: [1, 1, 0] }, // Luis 2/3
};
const FECHAS_ACADEMIA: Record<number, string> = { 5: '2026-10-10', 6: '2026-10-16', 7: '2026-10-17' };

const DE_ACADEMIA: Intento[] = Object.entries(ACADEMIA).flatMap(([q, porEstudiante]) => {
  const quizId = Number(q);
  const preguntas = MOCK_PREGUNTAS.filter((p) => p.quizId === quizId);
  return Object.entries(porEstudiante).map(([e, aciertos]) => {
    const respuestas = preguntas.map((p, i) => {
      const valor = aciertos[i] ? (p.tipo === 'corta' ? p.aceptadas[0] : p.correcta) : (p.tipo === 'corta' ? 'no sé' : p.tipo === 'vf' ? 1 - p.correcta : (p.correcta + 1) % p.opciones.length);
      return { preguntaId: p.id, valor, correcta: esCorrecta(p, valor) };
    });
    return {
      id: ++idIntento, quizId, estudianteId: Number(e), inicio: `${FECHAS_ACADEMIA[quizId]}T20:00:00`, fin: `${FECHAS_ACADEMIA[quizId]}T20:09:00`, respuestas,
      puntaje: preguntas.reduce((s, p, i) => s + (respuestas[i].correcta ? p.puntos : 0), 0),
      puntajeMax: preguntas.reduce((s, p) => s + p.puntos, 0),
    };
  });
});

export const MOCK_INTENTOS: Intento[] = [...COLEGIO, ...DE_ACADEMIA];
