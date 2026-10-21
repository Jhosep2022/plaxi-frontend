// Contratos de /auth (cuando exista el backend, son los cuerpos y respuestas de cada endpoint)

export type TipoCuenta = 'estudiante' | 'docente';

// POST /auth/login
export interface Credenciales {
  usuario: string; // nombre de usuario o correo
  clave: string;
}

// POST /auth/registro
export interface Registro {
  tipo: TipoCuenta;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
  usuario: string;
  clave: string;
  academia?: { nombre: string; slug: string; primerCurso: { nombre: string; categoria: string } | null }; // solo docente
  codigoCurso?: string; // estudiante que llega con un código o link de invitación
}

export interface ResultadoRegistro {
  usuarioId: number;
  espacioSlug: string | null; // academia creada o a la que se unió
  aulaId: number | null; // curso al que se unió o primer curso creado
  inscripcion: 'ACTIVA' | 'PENDIENTE' | null;
}

// POST /auth/solicitudes-colegio (los colegios no se registran solos: dejan una solicitud)
export type EstadoSolicitudColegio = 'nueva' | 'contactado' | 'convertido' | 'descartado';

export interface SolicitudColegio {
  id: number;
  colegio: string;
  ciudad: string;
  contacto: string;
  cargo: string;
  correo: string;
  telefono: string;
  estudiantes: number; // aproximado
  mensaje: string;
  fecha: string; // ISO
  estado: EstadoSolicitudColegio;
}

export type NuevaSolicitudColegio = Omit<SolicitudColegio, 'id' | 'fecha' | 'estado'>;

export const CIUDADES = ['La Paz', 'El Alto', 'Cochabamba', 'Santa Cruz', 'Sucre', 'Oruro', 'Potosí', 'Tarija', 'Trinidad', 'Cobija'];

// Dirección web de un espacio a partir de su nombre: "Academia de Ana López" -> "academia-de-ana-lopez"
export function slugDe(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const PATRON_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
