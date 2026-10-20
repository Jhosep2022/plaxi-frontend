import { Nivel } from './academico.model';

export type Dependencia = 'fiscal' | 'particular' | 'convenio';

export const DEPENDENCIAS: { id: Dependencia; label: string }[] = [
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'particular', label: 'Particular' },
  { id: 'convenio', label: 'De convenio' },
];

export const DEPARTAMENTOS = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'];

// Datos generales de la unidad educativa (aparecen en boletines, reportes y el selector de espacios)
export interface Institucion {
  id: number; // = espacioId
  nombre: string;
  sigla: string;
  lema: string;
  codigoSie: string; // código del Sistema de Información Educativa (8 dígitos)
  dependencia: Dependencia;
  niveles: Nivel[];
  fundacion: number; // año
  departamento: string;
  municipio: string;
  zona: string;
  direccion: string;
  telefono: string;
  email: string;
  sitioWeb: string;
  director: string;
  subdirector: string;
  logo: string; // imagen como data URL ('' = sin logo)
}
