export interface InscripcionDto {
  usuarioId: number;
  cursoId: number;
}

export interface InscripcionResponseDto {
  idInscripcion: number;
  fechaInscripcion: string;
  estadoInscripcion: string;
  usuarioId: number;
  usuarioNombre: string;
  usuarioGmail: string;
  cursoId: number;
  cursoNombre: string;
  usuarioCreadorId: number | null;
}
