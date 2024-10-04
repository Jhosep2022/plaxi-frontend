export interface CursoDto {
    idCurso: number;
    nombre: string;
    descripcion: string;
    dificultad: string;
    estado: boolean;
    categoriaId: number;
    portadaUrl?: string;  // URL de la portada (opcional)
  }

export interface ActualizarCursoDto {
    nombre: string;
    descripcion: string;
    dificultad: string;
    estado: boolean;
    categoriaId: number;
    file?: File;  // Archivo de la portada (opcional)
}
    