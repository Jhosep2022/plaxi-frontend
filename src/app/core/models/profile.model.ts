import type { ProfileDto } from '../../models/profile.dto';
import type { SpaceRole, SpaceType } from './space.model';

// Datos del perfil que no vienen en PerfilDto (cuando exista el backend serán parte de /perfil)
export interface ProfileLinks {
  sitio: string;
  linkedin: string;
  instagram: string;
  youtube: string;
}

export interface EmergencyContact {
  nombre: string;
  parentesco: string;
  telefono: string;
}

export type NotificationChannel = 'correo' | 'app';
export type NotificationType = 'comunicados' | 'tareas' | 'calificaciones' | 'asistencia' | 'sesiones' | 'resumen';
export type NotificationPreferences = Record<NotificationType, Record<NotificationChannel, boolean>>;

// Dispositivo con la sesión abierta (GET /api/perfil/dispositivos)
export interface ProfileDevice {
  id: string; // id de la sesión
  nombre: string; // "Chrome en Windows"
  tipo: 'escritorio' | 'movil';
  ip: string;
  ultimoUso: string; // ISO
  actual: boolean;
}

export interface ProfileDetails {
  fechaNacimiento: string; // YYYY-MM-DD ('' si no la indicó)
  direccion: string;
  especialidad: string; // docente
  bio: string; // docente: presentación corta (en la academia se ve en el catálogo)
  enlaces: ProfileLinks;
  contactoEmergencia: EmergencyContact; // estudiante
  miembroDesde: string; // YYYY-MM-DD
  ultimoAcceso: string; // ISO
  claveActualizada: string; // YYYY-MM-DD
  notificaciones: NotificationPreferences;
}

export interface UserProfile extends ProfileDto, ProfileDetails {}

// Dato destacado de la cabecera del perfil (cambia según el rol)
export interface ProfileIndicator {
  label: string;
  valor: string;
  detalle: string;
  tono: 'lima' | 'azul' | 'crema';
  ayuda: string; // how it is calculated (tooltip)
}

// Espacio al que pertenece el usuario, para la pestaña "Mis espacios"
export interface ProfileSpace {
  espacioId: number;
  slug: string;
  nombre: string;
  tipo: SpaceType;
  rol: SpaceRole;
  desde: string; // YYYY-MM-DD
  puedeSalir: boolean;
  motivo: string; // por qué no puede salir ('' si puede)
  puedeRechazar: boolean; // un colegio unió esta cuenta por su correo hace menos de 30 días
}

// Tipos de aviso que el usuario puede configurar (algunos solo aplican a ciertos roles o espacios)
// soloApp: el aviso llega solo en la app, nunca por correo (decidido por el fundador); lo de la semana va en el resumen, que también es solo de la app
export const NOTIFICATION_TYPES: { id: NotificationType; label: string; descripcion: string; roles?: SpaceRole[]; tipo?: SpaceType; soloApp?: boolean }[] = [
  { id: 'comunicados', label: 'Comunicados', descripcion: 'Avisos de la dirección o de tus docentes.' },
  { id: 'tareas', label: 'Tareas', descripcion: 'Tareas nuevas, entregas y revisiones.', soloApp: true },
  { id: 'calificaciones', label: 'Calificaciones', descripcion: 'Cuando se publica una nota nueva.', roles: ['estudiante', 'padre', 'docente'], soloApp: true },
  { id: 'asistencia', label: 'Asistencia', descripcion: 'Faltas, atrasos y licencias.', roles: ['estudiante', 'padre', 'direccion'], tipo: 'colegio', soloApp: true },
  { id: 'sesiones', label: 'Sesiones en vivo', descripcion: 'Recordatorio 10 minutos antes de cada sesión.', tipo: 'academia' },
  { id: 'resumen', label: 'Resumen semanal', descripcion: 'Cada lunes, en tus avisos, lo más importante de la semana.', soloApp: true },
];

export const PHOTO_MAX_KB = 800;
