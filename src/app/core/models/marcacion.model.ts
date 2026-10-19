import { Turno } from './academico.model';

// Lugar físico donde el personal marca (con su pantalla de QR y su zona GPS permitida)
export interface PuntoMarcacion {
  id: number;
  espacioId: number;
  nombre: string;
  latitud: number;
  longitud: number;
  radioM: number; // metros alrededor del punto donde se acepta la marcación
  activo: boolean;
  secreto: string; // semilla del código rotativo (en un backend real nunca sale del servidor)
}

export const RADIO_POR_DEFECTO = 100;
export const SEGUNDOS_POR_CODIGO = 30;

// Horario del personal por turno y tolerancia de atraso
export interface HorarioLaboral {
  id: number; // = espacioId
  toleranciaMin: number;
  turnos: { turno: Turno; entrada: string; salida: string }[];
}

export type TipoMarcacion = 'entrada' | 'salida';
export type EstadoMarcacion = 'a-tiempo' | 'atraso' | 'salida-anticipada' | 'salida';

export interface Marcacion {
  id: number;
  espacioId: number;
  docenteId: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  tipo: TipoMarcacion;
  estado: EstadoMarcacion;
  minutos: number; // minutos de atraso o de salida anticipada (0 si no aplica)
  puntoId: number;
  distanciaM: number; // distancia al punto cuando marcó
}

export const ESTADO_MARCACION_LABEL: Record<EstadoMarcacion, string> = {
  'a-tiempo': 'A tiempo',
  atraso: 'Con atraso',
  'salida-anticipada': 'Salida anticipada',
  salida: 'Salida',
};
