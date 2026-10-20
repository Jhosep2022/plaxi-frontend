export type Publico = 'padres' | 'estudiantes' | 'docentes';
export type CategoriaComunicado = 'general' | 'academico' | 'evento' | 'administrativo';

export const PUBLICOS: { id: Publico; label: string }[] = [
  { id: 'padres', label: 'Padres y tutores' },
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'docentes', label: 'Docentes' },
];

export const CATEGORIAS_COMUNICADO: { id: CategoriaComunicado; label: string; tono: string }[] = [
  { id: 'general', label: 'General', tono: 'tono-azul' },
  { id: 'academico', label: 'Académico', tono: 'tono-lima' },
  { id: 'evento', label: 'Evento', tono: 'tono-crema' },
  { id: 'administrativo', label: 'Administrativo', tono: '' },
];

// Aviso de la dirección o de un docente
export interface Comunicado {
  id: number;
  espacioId: number;
  autorId: number;
  autorNombre: string;
  autorRol: 'direccion' | 'docente';
  titulo: string;
  mensaje: string;
  categoria: CategoriaComunicado;
  importante: boolean;
  publico: Publico[];
  paraleloIds: number[]; // cursos a los que va; vacío = todo el colegio
  pideConfirmacion: boolean; // los destinatarios deben marcar "Enterado"
  fechaEvento: string; // YYYY-MM-DD ('' si no es un evento)
  enviado: string; // fecha y hora ISO
}

// Lectura de un comunicado por un destinatario
export interface Lectura {
  id: number;
  comunicadoId: number;
  usuarioId: number;
  leidoEl: string; // ISO
  confirmado: boolean;
}
