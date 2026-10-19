import { Routes } from '@angular/router';
import { proximamente } from '../../core/routing/proximamente';

// /:espacio/direccion/... (solo existe en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent) },

  // Académico
  proximamente('academico/gestion', 'Gestión y periodos', 'Año escolar y sus periodos (trimestres o bimestres).'),
  proximamente('academico/paralelos', 'Grados y paralelos', 'Grados, paralelos y sus estudiantes (ej. 3ro A).'),
  proximamente('academico/materias', 'Materias', 'Materias que se dictan en cada grado.'),
  proximamente('academico/aulas', 'Aulas', 'Aulas, laboratorios y espacios físicos con su capacidad.'),
  proximamente('academico/asignaciones', 'Asignación docente', 'Qué docente dicta cada materia en cada paralelo.'),
  proximamente('academico/horarios', 'Horarios', 'Horario por paralelo, docente y aula, sin choques.'),

  // Personas
  proximamente('personas/docentes', 'Docentes'),
  proximamente('personas/estudiantes', 'Estudiantes'),
  proximamente('personas/padres', 'Padres y tutores legales'),
  proximamente('personas/inscripciones', 'Inscripciones', 'Inscripción de estudiantes a grados y paralelos.'),

  // Asistencia
  proximamente('asistencia/estudiantes', 'Asistencia de estudiantes', 'Por paralelo, materia y fecha, con el resumen diario.'),
  proximamente('asistencia/personal', 'Asistencia del personal', 'Marcaciones de entrada y salida, atrasos y ausencias.'),
  proximamente('asistencia/puntos-marcacion', 'Puntos de marcación', 'QR de cada punto de marcación y su ubicación GPS permitida.'),

  // Calificaciones
  proximamente('calificaciones/escala', 'Escala y ponderación', 'Nota máxima, nota de aprobación y peso de cada criterio.'),
  proximamente('calificaciones/periodos', 'Cierre de periodos'),
  proximamente('calificaciones/boletines', 'Boletines'),

  proximamente('reportes', 'Reportes'),
  proximamente('institucion', 'Datos de la institución'),
  proximamente('institucion/horario-laboral', 'Horario laboral', 'Horario de entrada y salida del personal y tolerancia de atraso.'),
] satisfies Routes;
