export type TipoPregunta = 'opcion' | 'vf' | 'corta';

export const TIPOS_PREGUNTA: { id: TipoPregunta; label: string }[] = [
  { id: 'opcion', label: 'Opción múltiple' },
  { id: 'vf', label: 'Verdadero o falso' },
  { id: 'corta', label: 'Respuesta corta' },
];

export interface Pregunta {
  id: number;
  quizId: number;
  enunciado: string;
  tipo: TipoPregunta;
  opciones: string[]; // opción múltiple
  correcta: number; // índice de la opción correcta (V/F: 0 = verdadero, 1 = falso)
  aceptadas: string[]; // respuestas válidas de la respuesta corta
  puntos: number;
  orden: number;
}

// Cuestionario de un aula, con corrección automática
export interface Quiz {
  id: number;
  aulaId: number;
  titulo: string;
  descripcion: string;
  tiempoMin: number; // 0 = sin límite
  intentos: number; // intentos permitidos
  cierre: string; // fecha límite YYYY-MM-DD
  horaCierre: string; // HH:mm
  mezclar: boolean; // preguntas en orden aleatorio
  mostrarRespuestas: boolean; // el estudiante ve las respuestas correctas al terminar
  publicado: boolean;
  actividadId: number; // actividad de la planilla donde va la nota (0 = no cuenta)
  creado: string; // ISO
}

export type Respuesta = number | string | null; // índice elegido o texto escrito

// Intento de un estudiante (ya corregido)
export interface Intento {
  id: number;
  quizId: number;
  estudianteId: number;
  inicio: string; // ISO
  fin: string; // ISO
  respuestas: { preguntaId: number; valor: Respuesta; correcta: boolean }[];
  puntaje: number;
  puntajeMax: number;
}

const normalizar = (t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

// ¿La respuesta es correcta?
export function esCorrecta(p: Pregunta, valor: Respuesta): boolean {
  if (valor === null || valor === '') return false;
  if (p.tipo === 'corta') return p.aceptadas.some((a) => normalizar(a) === normalizar(String(valor)));
  return Number(valor) === p.correcta;
}

// Texto legible de una respuesta
export function textoRespuesta(p: Pregunta, valor: Respuesta): string {
  if (valor === null || valor === '') return 'Sin responder';
  if (p.tipo === 'vf') return Number(valor) === 0 ? 'Verdadero' : 'Falso';
  if (p.tipo === 'opcion') return p.opciones[Number(valor)] ?? '—';
  return String(valor);
}

export function respuestaCorrecta(p: Pregunta): string {
  if (p.tipo === 'vf') return p.correcta === 0 ? 'Verdadero' : 'Falso';
  if (p.tipo === 'opcion') return p.opciones[p.correcta] ?? '—';
  return p.aceptadas.join(' / ');
}
