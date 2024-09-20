export interface PerfilDto {
  idUsuario: number;
  username: string;
  gmail: string;
  status: boolean;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
  ci: string;
  imagenUrl?: string;  // URL de la imagen de perfil
}

export interface ActualizarPerfilDto {
  username: string;
  gmail: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
  ci: string;
  file?: File;  // Archivo opcional para la imagen de perfil
}
