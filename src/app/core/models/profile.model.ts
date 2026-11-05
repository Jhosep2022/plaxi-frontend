import type { PerfilDto } from '../../models/PerfilDto';
import type { Rol, TipoEspacio } from './espacio.model';

// Datos del perfil que no vienen en PerfilDto (cuando exista el backend serán parte de /perfil)
export interface EnlacesPerfil {
  sitio: string;
  linkedin: string;
  instagram: string;
  youtube: string;
}

export interface ContactoEmergencia {
  nombre: string;
  parentesco: string;
  telefono: string;
}

export type CanalNotificacion = 'correo' | 'app';
export type TipoNotificacion = 'comunicados' | 'tareas' | 'calificaciones' | 'asistencia' | 'sesiones' | 'resumen';
export type PreferenciasNotificacion = Record<TipoNotificacion, Record<CanalNotificacion, boolean>>;

// Dispositivo con la sesión abierta
export interface Dispositivo {
  id: number;
  nombre: string; // "Chrome en Windows"
  tipo: 'escritorio' | 'movil';
  ubicacion: string;
  ultimoUso: string; // ISO
  actual: boolean;
}

export interface PerfilExtra {
  fechaNacimiento: string; // YYYY-MM-DD ('' si no la indicó)
  direccion: string;
  especialidad: string; // docente
  bio: string; // docente: presentación corta (en la academia se ve en el catálogo)
  enlaces: EnlacesPerfil;
  contactoEmergencia: ContactoEmergencia; // estudiante
  miembroDesde: string; // YYYY-MM-DD
  ultimoAcceso: string; // ISO
  claveActualizada: string; // YYYY-MM-DD
  notificaciones: PreferenciasNotificacion;
  dispositivos: Dispositivo[];
}

export interface Perfil extends PerfilDto, PerfilExtra {}

// Dato destacado de la cabecera del perfil (cambia según el rol)
export interface IndicadorPerfil {
  label: string;
  valor: string;
  detalle: string;
  tono: 'lima' | 'azul' | 'crema';
}

// Espacio al que pertenece el usuario, para la pestaña "Mis espacios"
export interface EspacioDelPerfil {
  espacioId: number;
  slug: string;
  nombre: string;
  tipo: TipoEspacio;
  rol: Rol;
  desde: string; // YYYY-MM-DD
  puedeSalir: boolean;
  motivo: string; // por qué no puede salir ('' si puede)
}

// Tipos de aviso que el usuario puede configurar (algunos solo aplican a ciertos roles o espacios)
export const NOTIFICACIONES: { id: TipoNotificacion; label: string; descripcion: string; roles?: Rol[]; tipo?: TipoEspacio }[] = [
  { id: 'comunicados', label: 'Comunicados', descripcion: 'Avisos de la dirección o de tus docentes.' },
  { id: 'tareas', label: 'Tareas', descripcion: 'Tareas nuevas, entregas y revisiones.' },
  { id: 'calificaciones', label: 'Calificaciones', descripcion: 'Cuando se publica una nota nueva.', roles: ['estudiante', 'padre', 'docente'] },
  { id: 'asistencia', label: 'Asistencia', descripcion: 'Faltas, atrasos y licencias.', roles: ['estudiante', 'padre', 'direccion'], tipo: 'colegio' },
  { id: 'sesiones', label: 'Sesiones en vivo', descripcion: 'Recordatorio 10 minutos antes de cada sesión.', tipo: 'academia' },
  { id: 'resumen', label: 'Resumen semanal', descripcion: 'Un correo cada lunes con lo más importante de la semana.' },
];

export const FOTO_MAX_KB = 800;
