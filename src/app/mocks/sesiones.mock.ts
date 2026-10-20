// ============================================================================
// DATOS MOCKEADOS de Sesiones en vivo (cursos de la Academia de María)
// Aulas: 1001 Angular desde cero · 1002 Java y Spring Boot · 1003 Fundamentos de UI/UX
// ============================================================================
import type { AsistenciaSesion, Sesion } from '../core/models/sesiones.model';

const MEET = 'https://meet.google.com/qwz-angl-mar';
const ZOOM = 'https://zoom.us/j/84512369874';

export const MOCK_SESIONES: Sesion[] = [
  { id: 1, aulaId: 1001, titulo: 'Bienvenida e instalación del entorno', descripcion: 'Instalamos Node y Angular CLI y creamos el primer proyecto.', fecha: '2026-10-06', inicio: '10:00', fin: '11:30', plataforma: 'meet', enlace: MEET, grabacion: 'https://drive.google.com/file/d/grabacion-angular-1' },
  { id: 2, aulaId: 1001, titulo: 'Componentes y comunicación', descripcion: '@Input, @Output y signals.', fecha: '2026-10-13', inicio: '10:00', fin: '11:30', plataforma: 'meet', enlace: MEET, grabacion: 'https://drive.google.com/file/d/grabacion-angular-2' },
  { id: 3, aulaId: 1001, titulo: 'Preguntas y respuestas', descripcion: 'Resolvemos dudas de la semana y revisamos los ejercicios.', fecha: '2026-10-19', inicio: '18:00', fin: '19:00', plataforma: 'meet', enlace: MEET, grabacion: '' },
  { id: 4, aulaId: 1001, titulo: 'Servicios e inyección de dependencias', descripcion: '', fecha: '2026-10-20', inicio: '10:00', fin: '11:30', plataforma: 'meet', enlace: MEET, grabacion: '' },
  { id: 5, aulaId: 1001, titulo: 'Routing y navegación', descripcion: '', fecha: '2026-10-27', inicio: '10:00', fin: '11:30', plataforma: 'meet', enlace: MEET, grabacion: '' },
  { id: 6, aulaId: 1003, titulo: 'Principios de diseño visual', descripcion: 'Contraste, jerarquía y espaciado con ejemplos reales.', fecha: '2026-10-15', inicio: '18:00', fin: '19:00', plataforma: 'zoom', enlace: ZOOM, grabacion: '' },
  { id: 7, aulaId: 1003, titulo: 'Prototipado rápido', descripcion: '', fecha: '2026-10-22', inicio: '18:00', fin: '19:00', plataforma: 'zoom', enlace: ZOOM, grabacion: '' },
  { id: 8, aulaId: 1002, titulo: 'Tu primera API REST', descripcion: 'Controladores y endpoints con Spring Boot.', fecha: '2026-10-21', inicio: '15:00', fin: '16:00', plataforma: 'zoom', enlace: 'https://zoom.us/j/96325874123', grabacion: '' },
];

// Luis (2) fue a la primera de Angular y a la de UI/UX pero faltó a la segunda de Angular; Carla (4) fue a ambas de Angular
export const MOCK_ASISTENCIA_SESIONES: AsistenciaSesion[] = [
  { id: 1, sesionId: 1, estudianteId: 2, unidoEl: '2026-10-06T09:58:00' },
  { id: 2, sesionId: 1, estudianteId: 4, unidoEl: '2026-10-06T10:03:00' },
  { id: 3, sesionId: 2, estudianteId: 4, unidoEl: '2026-10-13T10:01:00' },
  { id: 4, sesionId: 6, estudianteId: 2, unidoEl: '2026-10-15T18:05:00' },
];
