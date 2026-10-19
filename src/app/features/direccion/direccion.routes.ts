import { Routes } from '@angular/router';
import { proximamente } from '../../core/routing/proximamente';

// /:espacio/direccion/... (solo existe en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent) },

  // Académico
  { path: 'academico/gestion', title: 'Gestión y periodos', loadComponent: () => import('./academico/gestion/gestion.component').then((m) => m.GestionComponent) },
  { path: 'academico/paralelos', title: 'Grados y paralelos', loadComponent: () => import('./academico/paralelos/paralelos.component').then((m) => m.ParalelosComponent) },
  { path: 'academico/materias', title: 'Materias', loadComponent: () => import('./academico/materias/materias.component').then((m) => m.MateriasComponent) },
  { path: 'academico/aulas', title: 'Aulas', loadComponent: () => import('./academico/aulas/aulas.component').then((m) => m.AulasComponent) },
  { path: 'academico/asignaciones', title: 'Asignación docente', loadComponent: () => import('./academico/asignaciones/asignaciones.component').then((m) => m.AsignacionesComponent) },
  { path: 'academico/horarios', title: 'Horarios', loadComponent: () => import('./academico/horarios/horarios.component').then((m) => m.HorariosComponent) },

  // Personas
  proximamente('personas/docentes', 'Docentes'),
  proximamente('personas/estudiantes', 'Estudiantes'),
  proximamente('personas/padres', 'Padres y tutores legales'),
  proximamente('personas/inscripciones', 'Inscripciones', 'Inscripción de estudiantes a grados y paralelos.'),

  // Asistencia
  { path: 'asistencia/estudiantes', title: 'Asistencia de estudiantes', loadComponent: () => import('./asistencia/asistencia-estudiantes.component').then((m) => m.AsistenciaEstudiantesComponent) },
  { path: 'asistencia/licencias', title: 'Licencias', loadComponent: () => import('./asistencia/licencias.component').then((m) => m.LicenciasComponent) },
  { path: 'asistencia/personal', title: 'Asistencia del personal', loadComponent: () => import('./asistencia/personal-asistencia.component').then((m) => m.PersonalAsistenciaComponent) },
  { path: 'asistencia/puntos-marcacion', title: 'Puntos de marcación', loadComponent: () => import('./asistencia/puntos-marcacion.component').then((m) => m.PuntosMarcacionComponent) },

  // Calificaciones
  proximamente('calificaciones/escala', 'Escala y ponderación', 'Nota máxima, nota de aprobación y peso de cada criterio.'),
  proximamente('calificaciones/periodos', 'Cierre de periodos'),
  proximamente('calificaciones/boletines', 'Boletines'),

  proximamente('reportes', 'Reportes'),
  proximamente('institucion', 'Datos de la institución'),
  { path: 'institucion/jornada', title: 'Jornada escolar', loadComponent: () => import('./institucion/jornada/jornada.component').then((m) => m.JornadaComponent) },
  { path: 'institucion/horario-laboral', title: 'Horario laboral', loadComponent: () => import('./institucion/horario-laboral/horario-laboral.component').then((m) => m.HorarioLaboralComponent) },
] satisfies Routes;
