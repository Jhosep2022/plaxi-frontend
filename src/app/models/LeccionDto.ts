export interface LeccionDto {
    idLeccion?: number;
    titulo: string;
    orden: number;
    duracionEstimada: number;
    contenido: string;
    estado: boolean;
    cursoId: number; // Solo el ID del curso al que pertenece la lección
  }
  