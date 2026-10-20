// ============================================================================
// DATOS MOCKEADOS: datos generales del Colegio San José
// ============================================================================
import { Institucion } from '../core/models/institucion.model';

export const MOCK_INSTITUCIONES: Institucion[] = [
  {
    id: 1,
    nombre: 'Colegio San José',
    sigla: 'CSJ',
    lema: 'Educar en valores para servir',
    codigoSie: '80730215',
    dependencia: 'convenio',
    niveles: ['inicial', 'primaria', 'secundaria'],
    fundacion: 1965,
    departamento: 'La Paz',
    municipio: 'La Paz',
    zona: 'Sopocachi',
    direccion: 'Av. 6 de Agosto N° 2150',
    telefono: '22441122',
    email: 'secretaria@sanjose.edu.bo',
    sitioWeb: 'https://sanjose.edu.bo',
    director: 'Ana Rojas',
    subdirector: '',
    logo: '',
  },
];
