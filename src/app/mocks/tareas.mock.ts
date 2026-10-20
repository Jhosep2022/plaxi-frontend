// ============================================================================
// DATOS MOCKEADOS de Tareas (Colegio San José y Academia de María, octubre de 2026)
// ============================================================================
import type { Entrega, Tarea } from '../core/models/tareas.model';
import { MOCK_ASIGNACIONES } from './academico.mock';
import { MOCK_AULAS_VIRTUALES, estudiantesDeAula } from './aulas.mock';
import { MOCK_ESTUDIANTES } from './asistencia.mock';
import { MOCK_ACTIVIDADES } from './calificaciones.mock';
import { MOCK_INSCRIPCIONES } from './mock-data';

const E = 1;

// La tarea de Física de 3ro A se califica en la "Práctica 3" de la planilla (todavía sin notas)
const practica3Fisica3A = MOCK_ACTIVIDADES.find((a) => a.paraleloId === 5 && a.materiaId === 8 && a.nombre === 'Práctica 3')?.id ?? 0;

// En el colegio, el aula de una tarea es la asignación (materia + paralelo)
const aulaDeClase = (paraleloId: number, materiaId: number) => MOCK_ASIGNACIONES.find((a) => a.paraleloId === paraleloId && a.materiaId === materiaId)?.id ?? 0;

const TAREAS_COLEGIO: Omit<Tarea, 'aulaId'>[] = [
  {
    id: 1, espacioId: E, paraleloId: 5, materiaId: 8, docenteId: 3, titulo: 'Problemas de MRUV (guía 3)',
    instrucciones: 'Resuelve los problemas 1 al 10 de la guía 3 mostrando el procedimiento completo. Puedes entregar una foto clara de tu cuaderno.',
    asignada: '2026-10-12', entrega: '2026-10-16', hora: '23:59', actividadId: practica3Fisica3A,
  },
  {
    id: 2, espacioId: E, paraleloId: 5, materiaId: 7, docenteId: 3, titulo: 'Ejercicios de funciones lineales',
    instrucciones: 'Grafica las funciones del ejercicio 4 (a–f) e indica la pendiente y la ordenada al origen de cada una.',
    asignada: '2026-10-15', entrega: '2026-10-21', hora: '23:59', actividadId: 0,
  },
  {
    id: 3, espacioId: E, paraleloId: 5, materiaId: 10, docenteId: 7, titulo: 'Ensayo: mi lugar favorito de Bolivia',
    instrucciones: 'Escribe un ensayo de una página (introducción, desarrollo y conclusión) sobre un lugar de Bolivia que te guste. Cuida la ortografía.',
    asignada: '2026-10-16', entrega: '2026-10-23', hora: '18:00', actividadId: 0,
  },
  {
    id: 4, espacioId: E, paraleloId: 5, materiaId: 11, docenteId: 9, titulo: 'Vocabulary worksheet – Unit 5',
    instrucciones: 'Complete the worksheet with the new vocabulary of unit 5 and write one sentence with each word.',
    asignada: '2026-10-08', entrega: '2026-10-14', hora: '23:59', actividadId: 0,
  },
  {
    id: 5, espacioId: E, paraleloId: 7, materiaId: 8, docenteId: 3, titulo: 'Informe de laboratorio: caída libre',
    instrucciones: 'Presenta el informe del experimento de caída libre con tabla de datos, gráfica y conclusiones.',
    asignada: '2026-10-13', entrega: '2026-10-20', hora: '23:59', actividadId: 0,
  },
  {
    id: 6, espacioId: E, paraleloId: 6, materiaId: 7, docenteId: 3, titulo: 'Práctica de geometría analítica',
    instrucciones: 'Resuelve la práctica de distancia entre dos puntos y punto medio (10 ejercicios).',
    asignada: '2026-10-07', entrega: '2026-10-13', hora: '23:59', actividadId: 0,
  },
  {
    id: 7, espacioId: E, paraleloId: 4, materiaId: 3, docenteId: 12, titulo: 'Fracciones: ejercicios del libro (pág. 45)',
    instrucciones: 'Resuelve los ejercicios 1 al 12 de la página 45 del libro de Matemáticas.',
    asignada: '2026-10-12', entrega: '2026-10-16', hora: '23:59', actividadId: 0,
  },
];

// Academia: tareas de práctica en los cursos de María (no cuentan para una nota; se revisan con un comentario)
const TAREAS_ACADEMIA: Tarea[] = [
  {
    id: 8, espacioId: 2, aulaId: 1001, paraleloId: 0, materiaId: 0, docenteId: 3, titulo: 'Mini proyecto: lista de tareas con componentes',
    instrucciones: 'Crea una app de lista de tareas con al menos dos componentes que se comuniquen con input y output. Sube el enlace a tu repositorio de GitHub.',
    asignada: '2026-10-15', entrega: '2026-10-24', hora: '23:59', actividadId: 0,
  },
  {
    id: 9, espacioId: 2, aulaId: 1003, paraleloId: 0, materiaId: 0, docenteId: 3, titulo: 'Wireframe de una app de delivery',
    instrucciones: 'Diseña en baja fidelidad las pantallas de inicio, menú y carrito de una app de delivery. Puedes hacerlo en papel o en Figma.',
    asignada: '2026-10-09', entrega: '2026-10-16', hora: '23:59', actividadId: 0,
  },
];

export const MOCK_TAREAS: Tarea[] = [...TAREAS_COLEGIO.map((t) => ({ ...t, aulaId: aulaDeClase(t.paraleloId, t.materiaId) })), ...TAREAS_ACADEMIA];

// Estudiantes del aula de la tarea
function alumnosDe(t: Tarea): { id: number; nombre: string }[] {
  const aula = MOCK_AULAS_VIRTUALES.find((a) => a.id === t.aulaId);
  return (aula ? estudiantesDeAula(aula) : []).map((id) => ({
    id,
    nombre: MOCK_ESTUDIANTES.find((e) => e.id === id)?.nombre ?? MOCK_INSCRIPCIONES.find((i) => i.usuarioId === id)?.usuarioNombre ?? '',
  }));
}

function azar(semilla: string): number {
  let h = 2166136261;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// Qué estudiantes entregaron cada tarea, y cuáles ya revisó el docente
const PLAN: Record<number, { entregan: number; tarde: number; revisadas: boolean }> = {
  1: { entregan: 0.9, tarde: 0.15, revisadas: false },
  2: { entregan: 0.4, tarde: 0, revisadas: false },
  3: { entregan: 0.15, tarde: 0, revisadas: false },
  4: { entregan: 0.85, tarde: 0.1, revisadas: true },
  5: { entregan: 0.5, tarde: 0, revisadas: false },
  6: { entregan: 0.9, tarde: 0.1, revisadas: true },
  7: { entregan: 0.8, tarde: 0.1, revisadas: true },
  8: { entregan: 0, tarde: 0, revisadas: false },
  9: { entregan: 0, tarde: 0, revisadas: true },
};
const COMENTARIOS = ['Muy buen trabajo.', 'Bien, revisa la presentación.', 'Completo y ordenado.', 'Te faltó justificar algunos pasos.', 'Excelente.'];

// Historia fija: Luis entregó Física e Inglés (revisada) pero aún no Matemáticas ni Lenguaje; Sofía no entregó Fracciones.
// Academia: Carla entregó el mini proyecto de Angular y Luis todavía no; Luis entregó el wireframe de UI/UX y ya está revisado.
const FIJAS: Record<string, boolean> = { '1-2': true, '2-2': false, '3-2': false, '4-2': true, '7-1400': false, '8-4': true, '8-2': false, '9-2': true };
const TEXTOS: Record<string, string> = {
  '1-2': 'Adjunto la foto de los 10 problemas resueltos. El 7 me costó un poco.',
  '8-4': 'Aquí está mi repositorio: github.com/carlag/lista-tareas. Usé dos componentes y un servicio.',
  '9-2': 'Adjunto las tres pantallas en Figma.',
};
const COMENTARIOS_FIJOS: Record<string, string> = {
  '4-2': 'Good job, Luis! Watch your spelling.',
  '9-2': 'Buen flujo de pantallas, Luis. Revisa el contraste del botón "Pagar" y el tamaño de los textos.',
};

let idEntrega = 0;
export const MOCK_ENTREGAS: Entrega[] = MOCK_TAREAS.flatMap((t) =>
  alumnosDe(t).flatMap((e): Entrega[] => {
    const plan = PLAN[t.id];
    const r = azar(`${t.id}-${e.id}`);
    const entrega = FIJAS[`${t.id}-${e.id}`] ?? r < plan.entregan;
    if (!entrega) return [];
    const tarde = e.id !== 2 && azar(`tarde-${t.id}-${e.id}`) < plan.tarde;
    const dia = tarde ? t.entrega.replace(/\d\d$/, (d) => String(Number(d) + 1).padStart(2, '0')) : t.entrega;
    return [{
      id: ++idEntrega,
      tareaId: t.id,
      estudianteId: e.id,
      texto: TEXTOS[`${t.id}-${e.id}`] ?? 'Adjunto mi trabajo.',
      archivo: `${t.titulo.split(' ')[0].toLowerCase()}-${e.nombre.split(' ')[0].toLowerCase()}.pdf`.normalize('NFD').replace(/[̀-ͯ]/g, ''),
      entregadaEl: `${dia}T${tarde ? '09' : String(14 + Math.floor(r * 8)).padStart(2, '0')}:${String(Math.floor(r * 60)).padStart(2, '0')}:00`,
      revisada: plan.revisadas,
      comentario: plan.revisadas ? COMENTARIOS_FIJOS[`${t.id}-${e.id}`] ?? COMENTARIOS[Math.floor(r * COMENTARIOS.length)] : '',
    }];
  })
);
