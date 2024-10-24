export interface TemaDto {
    idTema: number;
    titulo: string;
    orden: number;
    descripcion: string;
    recursoMultimedia: string;
    estado: boolean;
    leccionId: number; // Solo el ID de la lección a la que pertenece el tema
  }
  