export interface ProfileDto {
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
  isAdmin?: boolean;
  pending?: boolean;
}

export interface UpdateProfileDto {
  username: string;
  gmail: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  telefono: string;
  ci: string;
  file?: File;
}
