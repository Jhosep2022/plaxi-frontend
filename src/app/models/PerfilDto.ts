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
  imagenUrl?: string;
  id_rol: string;
}

export interface ActualizarPerfilDto {
  username: string;
  gmail: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
  ci: string;
  file?: File;
}
