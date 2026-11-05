// Un espacio es la organización dentro de la cual trabaja el usuario:
// un colegio (institución completa) o la academia de un docente independiente.
export type SpaceType = 'colegio' | 'academia';

// Dos niveles de rol (igual que el backend):
// - Rol: lo que la persona es dentro de un espacio. Puede tener varios en el mismo espacio.
// - RolPlataforma: el administrador de QuizWiz (nosotros), por encima de todos los espacios (profile.isAdmin).
//   Administra los espacios desde /admin, pero no entra a sus datos internos (notas, asistencia, estudiantes).
export type SpaceRole = 'direccion' | 'docente' | 'estudiante' | 'padre';
export type PlatformRole = 'admin';

export const SPACE_ROLE_LABEL: Record<SpaceRole, string> = {
  direccion: 'Dirección',
  docente: 'Docente',
  estudiante: 'Estudiante',
  padre: 'Padre / Tutor legal',
};

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  admin: 'Administrador de la plataforma',
};

export const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  colegio: 'Institución',
  academia: 'Academia',
};

// Criterio de evaluación con su peso dentro de la nota final (ej. Exámenes 40%)
export interface WeightedCriterion {
  nombre: string;
  porcentaje: number;
}

// Escala de calificación editable por cada espacio
export interface GradingScale {
  notaMaxima: number;
  notaAprobacion: number;
  criterios: WeightedCriterion[];
}

export const DEFAULT_GRADING_SCALE: GradingScale = {
  notaMaxima: 100,
  notaAprobacion: 51,
  criterios: [{ nombre: 'Evaluación general', porcentaje: 100 }],
};

export interface Space {
  id: number;
  slug: string; // identificador en la URL: /colegio-san-jose/...
  nombre: string;
  tipo: SpaceType;
  escala: GradingScale;
}

// Pertenencia de un usuario a un espacio con un rol
export interface Membership {
  espacio: Space;
  rol: SpaceRole;
}
