import { Routes } from '@angular/router';

// /:espacio/direccion/... (solo existe en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../overview/resumen.component').then((m) => m.ResumenComponent) },

  // Académico
  { path: 'academico/gestion', title: 'Gestión y periodos', loadComponent: () => import('./academics/academic-years/gestion.component').then((m) => m.GestionComponent) },
  { path: 'academico/paralelos', title: 'Grados y paralelos', loadComponent: () => import('./academics/class-groups/paralelos.component').then((m) => m.ParalelosComponent) },
  { path: 'academico/materias', title: 'Materias', loadComponent: () => import('./academics/subjects/materias.component').then((m) => m.MateriasComponent) },
  { path: 'academico/aulas', title: 'Aulas', loadComponent: () => import('./academics/classrooms/aulas.component').then((m) => m.AulasComponent) },
  { path: 'academico/asignaciones', title: 'Asignación docente', loadComponent: () => import('./academics/allocations/asignaciones.component').then((m) => m.AsignacionesComponent) },
  { path: 'academico/horarios', title: 'Horarios', loadComponent: () => import('./academics/schedules/schedules.component').then((m) => m.SchedulesComponent) },

  // Personas
  { path: 'personas/docentes', title: 'Docentes', loadComponent: () => import('./people/docentes.component').then((m) => m.DocentesComponent) },
  { path: 'personas/estudiantes', title: 'Estudiantes', loadComponent: () => import('./people/estudiantes.component').then((m) => m.EstudiantesComponent) },
  { path: 'personas/padres', title: 'Padres y tutores legales', loadComponent: () => import('./people/padres.component').then((m) => m.PadresComponent) },
  { path: 'personas/inscripciones', title: 'Inscripciones', loadComponent: () => import('./people/inscripciones.component').then((m) => m.InscripcionesComponent) },

  // Asistencia
  { path: 'asistencia/estudiantes', title: 'Asistencia de estudiantes', loadComponent: () => import('./attendance/asistencia-estudiantes.component').then((m) => m.AsistenciaEstudiantesComponent) },
  { path: 'asistencia/licencias', title: 'Licencias', loadComponent: () => import('./attendance/licencias.component').then((m) => m.LicenciasComponent) },
  { path: 'asistencia/personal', title: 'Asistencia del personal', loadComponent: () => import('./attendance/personal-asistencia.component').then((m) => m.PersonalAsistenciaComponent) },
  { path: 'asistencia/puntos-marcacion', title: 'Puntos de marcación', loadComponent: () => import('./attendance/puntos-marcacion.component').then((m) => m.PuntosMarcacionComponent) },

  // Calificaciones
  { path: 'calificaciones/escala', title: 'Escala y ponderación', loadComponent: () => import('./grades/escala.component').then((m) => m.EscalaComponent) },
  { path: 'calificaciones/periodos', title: 'Cierre de periodos', loadComponent: () => import('./grades/cierre-periodos.component').then((m) => m.CierrePeriodosComponent) },
  { path: 'calificaciones/boletines', title: 'Boletines', loadComponent: () => import('./grades/boletines.component').then((m) => m.BoletinesComponent) },

  { path: 'reportes', pathMatch: 'full', redirectTo: 'reportes/rendimiento' },
  { path: 'reportes/rendimiento', title: 'Rendimiento académico', loadComponent: () => import('./reports/rendimiento.component').then((m) => m.RendimientoComponent) },
  { path: 'reportes/asistencia', title: 'Reporte de asistencia', loadComponent: () => import('./reports/asistencia-reporte.component').then((m) => m.AsistenciaReporteComponent) },
  { path: 'reportes/puntualidad', title: 'Puntualidad del personal', loadComponent: () => import('./reports/puntualidad.component').then((m) => m.PuntualidadComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../announcements/comunicados.component').then((m) => m.ComunicadosComponent) },
  { path: 'institucion', title: 'Datos de la institución', loadComponent: () => import('./institution/data/datos-institucion.component').then((m) => m.DatosInstitucionComponent) },
  { path: 'institucion/jornada', title: 'Jornada escolar', loadComponent: () => import('./institution/workday/jornada.component').then((m) => m.JornadaComponent) },
  { path: 'institucion/horario-laboral', title: 'Horario laboral', loadComponent: () => import('./institution/work-schedule/horario-laboral.component').then((m) => m.HorarioLaboralComponent) },
] satisfies Routes;
