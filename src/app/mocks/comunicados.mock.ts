// ============================================================================
// DATOS MOCKEADOS de Comunicados (Colegio San José)
// ============================================================================
import { Comunicado, Lectura } from '../core/models/comunicados.model';

const E = 1;

export const MOCK_COMUNICADOS: Comunicado[] = [
  {
    id: 1, espacioId: E, autorId: 1, autorNombre: 'Ana Rojas', autorRol: 'direccion',
    titulo: 'Asueto por Todos Santos',
    mensaje: 'Comunicamos que el lunes 2 de noviembre no habrá clases por la festividad de Todos Santos. Las actividades se reanudan con normalidad el martes 3 de noviembre en sus horarios habituales.',
    categoria: 'administrativo', importante: false, publico: ['padres', 'estudiantes', 'docentes'], paraleloIds: [],
    pideConfirmacion: false, fechaEvento: '2026-11-02', enviado: '2026-10-19T08:10:00',
  },
  {
    id: 2, espacioId: E, autorId: 3, autorNombre: 'María Fernández', autorRol: 'docente',
    titulo: 'Examen de Física: miércoles 21 de octubre',
    mensaje: 'Estimadas familias: el miércoles 21 tendremos el examen de Física sobre cinemática (MRU y MRUV). Los estudiantes deben traer calculadora y regla. Les recomiendo repasar las prácticas 1 y 2.',
    categoria: 'academico', importante: true, publico: ['padres', 'estudiantes'], paraleloIds: [5],
    pideConfirmacion: false, fechaEvento: '2026-10-21', enviado: '2026-10-17T16:30:00',
  },
  {
    id: 3, espacioId: E, autorId: 1, autorNombre: 'Ana Rojas', autorRol: 'direccion',
    titulo: 'Reunión general de padres de familia',
    mensaje: 'Convocamos a todos los padres, madres y tutores a la reunión general del sábado 24 de octubre a las 9:00 en el coliseo del colegio. Trataremos el cierre del año escolar y la entrega de boletines. La asistencia es obligatoria; por favor confirme que recibió este comunicado.',
    categoria: 'evento', importante: true, publico: ['padres'], paraleloIds: [],
    pideConfirmacion: true, fechaEvento: '2026-10-24', enviado: '2026-10-16T11:00:00',
  },
  {
    id: 4, espacioId: E, autorId: 1, autorNombre: 'Ana Rojas', autorRol: 'direccion',
    titulo: 'Feria de ciencias 2026',
    mensaje: 'El viernes 30 de octubre realizaremos la Feria de ciencias en el patio central. Cada curso de secundaria presentará un proyecto. ¡Las familias están invitadas a visitarnos de 15:00 a 18:00!',
    categoria: 'evento', importante: false, publico: ['padres', 'estudiantes', 'docentes'], paraleloIds: [],
    pideConfirmacion: false, fechaEvento: '2026-10-30', enviado: '2026-10-14T10:20:00',
  },
  {
    id: 5, espacioId: E, autorId: 1, autorNombre: 'Ana Rojas', autorRol: 'direccion',
    titulo: 'Plazo para el registro de notas del 3er trimestre',
    mensaje: 'Recordamos a los docentes que el registro de notas del 3er trimestre cierra el viernes 27 de noviembre. Después de esa fecha la dirección cerrará el periodo y las notas quedarán bloqueadas.',
    categoria: 'academico', importante: true, publico: ['docentes'], paraleloIds: [],
    pideConfirmacion: true, fechaEvento: '', enviado: '2026-10-12T09:00:00',
  },
  {
    id: 6, espacioId: E, autorId: 3, autorNombre: 'María Fernández', autorRol: 'docente',
    titulo: 'Material para la práctica de Matemáticas',
    mensaje: 'Para la próxima clase de Matemáticas los estudiantes deben traer hojas cuadriculadas y compás. Trabajaremos geometría analítica.',
    categoria: 'academico', importante: false, publico: ['padres', 'estudiantes'], paraleloIds: [6],
    pideConfirmacion: false, fechaEvento: '', enviado: '2026-10-09T18:00:00',
  },
];

// Lecturas de los usuarios con cuenta; las del resto de destinatarios se generan al cargar el servicio
export const MOCK_LECTURAS: Lectura[] = [
  { id: 1, comunicadoId: 4, usuarioId: 6, leidoEl: '2026-10-14T20:05:00', confirmado: false },
  { id: 2, comunicadoId: 2, usuarioId: 2, leidoEl: '2026-10-17T19:12:00', confirmado: false },
  { id: 3, comunicadoId: 4, usuarioId: 2, leidoEl: '2026-10-15T07:40:00', confirmado: false },
  { id: 4, comunicadoId: 5, usuarioId: 3, leidoEl: '2026-10-12T12:30:00', confirmado: true },
  { id: 5, comunicadoId: 4, usuarioId: 3, leidoEl: '2026-10-14T11:00:00', confirmado: false },
];
