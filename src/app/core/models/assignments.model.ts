// Tarea que un docente asigna a una de sus aulas: una clase del colegio (materia + paralelo) o un curso de la academia
export interface Tarea {
  id: number;
  aulaId: number;
  titulo: string;
  instrucciones: string;
  asignada: string; // YYYY-MM-DD
  entrega: string; // fecha límite YYYY-MM-DD
  hora: string; // hora límite HH:mm
  aceptaTardias: boolean; // false: pasada la hora límite ya no se puede entregar
  actividadId: number | null; // actividad de la planilla de notas donde se califica (null = no cuenta para la nota)
}

export interface ArchivoEntrega {
  archivoId?: number;
  nombre: string;
  bytes: number;
}

// Entrega de un estudiante (y la revisión del docente). Va con la cuenta del estudiante.
export interface Entrega {
  id: number;
  tareaId: number;
  usuarioId: number;
  texto: string;
  archivos: ArchivoEntrega[];
  entregadaEl: string | null; // null si el docente la revisó sin que el estudiante entregara
  tarde: boolean;
  revisada: boolean;
  comentario: string; // comentario del docente
  revisadaEl: string | null;
}

export type EstadoEntrega = 'pendiente' | 'entregada' | 'tarde' | 'revisada' | 'no-entregada';

export const ESTADO_ENTREGA: Record<EstadoEntrega, { label: string; tono: string }> = {
  pendiente: { label: 'Pendiente', tono: 'tono-crema' },
  entregada: { label: 'Entregada', tono: 'tono-lima' },
  tarde: { label: 'Entregada tarde', tono: 'tono-crema' },
  revisada: { label: 'Revisada', tono: 'tono-azul' },
  'no-entregada': { label: 'No entregó', tono: 'alerta' },
};
