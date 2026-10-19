// ---------- Asistencia de estudiantes ----------
export type EstadoAsistencia = 'presente' | 'ausente' | 'atraso' | 'licencia';

export const ESTADOS_ASISTENCIA: { id: EstadoAsistencia; label: string; corto: string }[] = [
  { id: 'presente', label: 'Presente', corto: 'P' },
  { id: 'ausente', label: 'Ausente', corto: 'A' },
  { id: 'atraso', label: 'Atraso', corto: 'T' },
  { id: 'licencia', label: 'Licencia', corto: 'L' },
];

export const TOLERANCIA_POR_DEFECTO = 10; // minutos

// Estudiante del colegio y su paralelo en la gestión activa (0 = todavía sin inscribir)
export interface Estudiante {
  id: number;
  nombre: string;
  paraleloId: number;
  ci: string;
  fechaNacimiento: string; // YYYY-MM-DD
}

// Asistencia de un estudiante en una clase (materia + paralelo) en una fecha
export interface RegistroAsistencia {
  id: number;
  espacioId: number;
  paraleloId: number;
  materiaId: number;
  bloque: number;
  fecha: string; // YYYY-MM-DD
  estudianteId: number;
  estado: EstadoAsistencia;
  minutosTarde: number; // solo en atrasos (0 si no aplica)
  docenteId: number;
}

// Tolerancia de atraso que usa cada docente
export interface ConfigAsistenciaDocente {
  id: number; // = docenteId
  toleranciaMin: number;
}

// ---------- Licencias (faltas justificadas) ----------
export type EstadoLicencia = 'pendiente' | 'aprobada' | 'rechazada';

export interface Licencia {
  id: number;
  espacioId: number;
  estudianteId: number;
  solicitadaPor: number; // padre o tutor legal
  desde: string; // YYYY-MM-DD
  hasta: string;
  motivo: string;
  archivo: string; // nombre del respaldo adjunto ('' si no hay)
  estado: EstadoLicencia;
  respuesta: string; // comentario de la dirección
  creada: string; // YYYY-MM-DD
}

// ---------- Resumen diario (se calcula a partir de los registros por clase) ----------
export type EstadoDia = 'presente' | 'ausente' | 'atraso' | 'licencia' | 'parcial';

export const ESTADO_DIA_LABEL: Record<EstadoDia, string> = {
  presente: 'Asistió',
  ausente: 'Faltó',
  atraso: 'Con atraso',
  licencia: 'Con licencia',
  parcial: 'Faltó a algunas clases',
};
