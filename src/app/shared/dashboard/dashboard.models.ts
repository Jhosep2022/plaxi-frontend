import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

// Modelos genéricos del Resumen (dashboard). Los widgets solo conocen estos tipos;
// cada rol (docente, estudiante, dirección, padre) los llena con sus propios datos.

export type Tono = 'lima' | 'azul' | 'crema';

export interface Accion {
  label: string;
  icono: IconDefinition;
  link: string;
}

export interface TarjetaProgreso {
  titulo: string;
  icono: IconDefinition;
  tono: Tono;
  actual: number;
  total: number;
  unidad: string; // "temas", "lecciones"…
}

export interface EventoHorario {
  titulo: string;
  detalle: string; // aula, paralelo…
  inicio: string; // "08:00"
  fin: string; // "09:30"
  icono: IconDefinition;
  tono: Tono;
}

export interface ItemProximo {
  titulo: string;
  icono: IconDefinition;
  horario: string; // "08:00 – 09:30"
  detalle?: string;
  participantes: string[]; // nombres (se muestran como iniciales)
  totalParticipantes: number;
  accion?: Accion;
}

export interface ItemLista {
  titulo: string;
  subtitulo: string;
  icono: IconDefinition;
  tono: Tono;
  meta: string; // dato a la derecha: "32 estudiantes"
  link?: string;
}

export type EstadoDia = 'ok' | 'atraso' | 'falta' | 'hoy' | 'pendiente';

export interface DiaSemana {
  etiqueta: string; // "Lu"
  estado: EstadoDia;
}

export interface ResumenPerfil {
  nombre: string;
  organizacion: string;
  insignia: string;
  imagenUrl?: string;
  semana: {
    valor: number; // número grande: "4"
    texto: string; // "días puntual esta semana"
    dias: DiaSemana[];
  };
}

export interface ItemActividad {
  titulo: string;
  detalle: string;
  icono: IconDefinition;
  tono: Tono;
  meta: string;
}

export interface Bloque<T> {
  titulo: string;
  verTodo?: string; // link de "Ver todo"
  items: T[];
}

export interface ResumenData {
  saludo: string;
  subtitulo: string;
  accion?: Accion;
  progreso: TarjetaProgreso[];
  horario: { titulo: string; eventos: EventoHorario[]; desde: string; hasta: string };
  proximos: Bloque<ItemProximo>;
  lista: Bloque<ItemLista>;
  perfil: ResumenPerfil;
  actividad: Bloque<ItemActividad>;
  asistente: { sugerencia: string };
}
