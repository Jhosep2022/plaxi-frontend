import { IconoMateria } from './academico.model';
import { Tono } from '../../shared/dashboard/dashboard.models';

// Aula virtual: el espacio de una clase con su contenido, quiz, tareas, estudiantes y notas.
// En un colegio nace sola por cada asignación (materia + paralelo); en una academia la crea el docente (curso).
export type TipoAula = 'clase' | 'curso';

export interface Aula {
  id: number; // en el colegio, el id de la asignación
  espacioId: number;
  tipo: TipoAula;
  docenteId: number;
  paraleloId: number; // solo clase
  materiaId: number; // solo clase
  nombre: string; // curso: nombre propio; clase: se arma con materia y paralelo
  descripcion: string;
  portada: string; // imagen subida (data URL o URL); '' = ilustración por defecto
  icono: IconoMateria;
  tono: Tono;
  actualizado: string; // ISO de la última modificación del contenido
  // Solo cursos de academia
  categoria: string;
  nivel: string;
  visibilidad: 'publico' | 'privado'; // público: aparece en el catálogo
  codigo: string; // código del link de invitación (/unirse/CODIGO)
  aprobacionManual: boolean; // las inscripciones quedan pendientes hasta que el docente las apruebe
}

export const NIVELES_CURSO = ['Principiante', 'Intermedio', 'Avanzado'];

export type TipoTema = 'texto' | 'video' | 'pdf' | 'enlace';

export const TIPOS_TEMA: { id: TipoTema; label: string }[] = [
  { id: 'texto', label: 'Lectura' },
  { id: 'video', label: 'Video' },
  { id: 'pdf', label: 'Documento PDF' },
  { id: 'enlace', label: 'Enlace' },
];

// Unidad del aula (agrupa temas). Puede estar en borrador o bloqueada hasta completar la anterior.
export interface Unidad {
  id: number;
  aulaId: number;
  titulo: string;
  descripcion: string;
  orden: number;
  publicada: boolean;
  requiereAnterior: boolean; // el estudiante debe completar la unidad anterior para abrirla
}

export interface Tema {
  id: number;
  unidadId: number;
  titulo: string;
  tipo: TipoTema;
  contenido: string; // texto de la lectura o descripción del recurso
  url: string; // video, PDF (nombre del archivo) o enlace
  duracionMin: number;
  orden: number;
  publicado: boolean;
}

// Tema que un estudiante marcó como visto
export interface Progreso {
  id: number;
  temaId: number;
  estudianteId: number;
  completadoEl: string; // ISO
}
