export type Plataforma = 'meet' | 'zoom' | 'teams' | 'otra';

export const PLATAFORMAS: { id: Plataforma; label: string }[] = [
  { id: 'meet', label: 'Google Meet' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'teams', label: 'Microsoft Teams' },
  { id: 'otra', label: 'Otra' },
];

// Clase en vivo de un curso de academia
export interface Sesion {
  id: number;
  aulaId: number;
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  inicio: string; // HH:mm
  fin: string; // HH:mm
  plataforma: Plataforma;
  enlace: string;
  grabacion: string; // enlace a la grabación ('' si no hay)
}

// Estudiante que asistió a una sesión (se registra al unirse desde la app o lo marca el docente)
export interface AsistenciaSesion {
  id: number;
  sesionId: number;
  estudianteId: number;
  unidoEl: string; // ISO
}

export type EstadoSesion = 'proxima' | 'en-curso' | 'finalizada';

export const MINUTOS_ANTES = 10; // se puede entrar 10 minutos antes de la hora de inicio
