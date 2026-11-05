// Tarea que un docente asigna a una de sus aulas: una clase del colegio (materia + paralelo) o un curso de la academia
export interface Tarea {
  id: number;
  espacioId: number;
  aulaId: number;
  paraleloId: number; // 0 en los cursos de la academia
  materiaId: number; // 0 en los cursos de la academia
  docenteId: number;
  titulo: string;
  instrucciones: string;
  asignada: string; // YYYY-MM-DD
  entrega: string; // fecha límite YYYY-MM-DD
  hora: string; // hora límite HH:mm
  actividadId: number; // actividad de la planilla de notas donde se califica (0 = no cuenta para la nota)
}

// Entrega de un estudiante (y la revisión del docente)
export interface Entrega {
  id: number;
  tareaId: number;
  estudianteId: number;
  texto: string;
  archivo: string; // nombre del archivo adjunto ('' si no hay)
  entregadaEl: string; // ISO; '' si el docente la revisó sin que el estudiante entregara
  revisada: boolean;
  comentario: string; // comentario del docente
}

export type EstadoEntrega = 'pendiente' | 'entregada' | 'tarde' | 'revisada' | 'no-entregada';

export const ESTADO_ENTREGA: Record<EstadoEntrega, { label: string; tono: string }> = {
  pendiente: { label: 'Pendiente', tono: 'tono-crema' },
  entregada: { label: 'Entregada', tono: 'tono-lima' },
  tarde: { label: 'Entregada tarde', tono: 'tono-crema' },
  revisada: { label: 'Revisada', tono: 'tono-azul' },
  'no-entregada': { label: 'No entregó', tono: 'alerta' },
};
