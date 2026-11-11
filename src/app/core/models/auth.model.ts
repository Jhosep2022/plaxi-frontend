// Contratos de /auth (cuando exista el backend, son los cuerpos y respuestas de cada endpoint)

export type AccountType = 'estudiante' | 'docente';

// POST /auth/login
export interface Credentials {
  usuario: string; // nombre de usuario o correo
  clave: string;
}

// POST /auth/registro
export interface RegistrationData {
  tipo: AccountType;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  correo: string;
  usuario: string;
  clave: string;
  academia?: { nombre: string; slug: string; primerCurso: { nombre: string; categoria: string } | null }; // solo docente
  codigoCurso?: string; // estudiante que llega con un código o link de invitación
}

export interface RegistrationResult {
  usuarioId: number;
  espacioSlug: string | null; // academia creada o a la que se unió
  aulaId: number | null; // curso al que se unió o primer curso creado
  inscripcion: 'ACTIVA' | 'PENDIENTE' | null;
}

// POST /auth/solicitudes-colegio (los colegios no se registran solos: dejan una solicitud)
export type SchoolRequestStatus = 'nueva' | 'contactado' | 'convertido' | 'descartado';

export interface SchoolRequest {
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
  estado: SchoolRequestStatus;
}

export type NewSchoolRequest = Omit<SchoolRequest, 'id' | 'fecha' | 'estado'>;

export const CITIES = ['La Paz', 'El Alto', 'Cochabamba', 'Santa Cruz', 'Sucre', 'Oruro', 'Potosí', 'Tarija', 'Trinidad', 'Cobija'];

// Usual positions of the person who asks for Aulix on behalf of a school (another one can be typed)
export const SCHOOL_POSITIONS = [
  'Director(a)', 'Subdirector(a)', 'Propietario(a) o promotor(a)', 'Administrador(a)', 'Secretario(a)',
  'Coordinador(a) académico(a)', 'Docente', 'Padre o madre de familia',
];

// Dirección web de un espacio a partir de su nombre: "Academia de Ana López" -> "academia-de-ana-lopez"
export function createSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
