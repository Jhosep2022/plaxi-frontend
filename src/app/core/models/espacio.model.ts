// Un espacio es la organización dentro de la cual trabaja el usuario:
// un colegio (institución completa) o la academia de un docente independiente.
export type TipoEspacio = 'colegio' | 'academia';

export type Rol = 'direccion' | 'docente' | 'estudiante' | 'padre';

export const ROL_LABEL: Record<Rol, string> = {
  direccion: 'Dirección',
  docente: 'Docente',
  estudiante: 'Estudiante',
  padre: 'Padre / Tutor legal',
};

export const TIPO_ESPACIO_LABEL: Record<TipoEspacio, string> = {
  colegio: 'Institución',
  academia: 'Academia',
};

// Criterio de evaluación con su peso dentro de la nota final (ej. Exámenes 40%)
export interface CriterioPonderacion {
  nombre: string;
  porcentaje: number;
}

// Escala de calificación editable por cada espacio
export interface EscalaCalificacion {
  notaMaxima: number;
  notaAprobacion: number;
  criterios: CriterioPonderacion[];
}

export const ESCALA_POR_DEFECTO: EscalaCalificacion = {
  notaMaxima: 100,
  notaAprobacion: 51,
  criterios: [{ nombre: 'Evaluación general', porcentaje: 100 }],
};

export interface Espacio {
  id: number;
  slug: string; // identificador en la URL: /colegio-san-jose/...
  nombre: string;
  tipo: TipoEspacio;
  escala: EscalaCalificacion;
}

// Pertenencia de un usuario a un espacio con un rol
export interface Membresia {
  espacio: Espacio;
  rol: Rol;
}
