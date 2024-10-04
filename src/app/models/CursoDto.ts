// src/app/models/CursoDto.ts

// DTO para mostrar la información de los cursos
export interface CursoDto {
  idCurso: number;
  nombre: string;
  descripcion: string;
  dificultad: string;
  estado: boolean;
  categoriaId: number;
  portada?: string; // URL de la portada (opcional)
}

// DTO para actualizar o crear un curso
export interface ActualizarCursoDto {
  nombre: string;
  descripcion: string;
  dificultad: string;
  estado: boolean;
  categoriaId: number;
  usuarioCreadorId: number;
  portada?: File; // Archivo de la portada (opcional)
}
