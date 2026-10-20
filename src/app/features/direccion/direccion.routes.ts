import { Routes } from '@angular/router';

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
  { path: 'personas/docentes', title: 'Docentes', loadComponent: () => import('./personas/docentes.component').then((m) => m.DocentesComponent) },
  { path: 'personas/estudiantes', title: 'Estudiantes', loadComponent: () => import('./personas/estudiantes.component').then((m) => m.EstudiantesComponent) },
  { path: 'personas/padres', title: 'Padres y tutores legales', loadComponent: () => import('./personas/padres.component').then((m) => m.PadresComponent) },
  { path: 'personas/inscripciones', title: 'Inscripciones', loadComponent: () => import('./personas/inscripciones.component').then((m) => m.InscripcionesComponent) },

  // Asistencia
  { path: 'asistencia/estudiantes', title: 'Asistencia de estudiantes', loadComponent: () => import('./asistencia/asistencia-estudiantes.component').then((m) => m.AsistenciaEstudiantesComponent) },
  { path: 'asistencia/licencias', title: 'Licencias', loadComponent: () => import('./asistencia/licencias.component').then((m) => m.LicenciasComponent) },
  { path: 'asistencia/personal', title: 'Asistencia del personal', loadComponent: () => import('./asistencia/personal-asistencia.component').then((m) => m.PersonalAsistenciaComponent) },
  { path: 'asistencia/puntos-marcacion', title: 'Puntos de marcación', loadComponent: () => import('./asistencia/puntos-marcacion.component').then((m) => m.PuntosMarcacionComponent) },

  // Calificaciones
  { path: 'calificaciones/escala', title: 'Escala y ponderación', loadComponent: () => import('./calificaciones/escala.component').then((m) => m.EscalaComponent) },
  { path: 'calificaciones/periodos', title: 'Cierre de periodos', loadComponent: () => import('./calificaciones/cierre-periodos.component').then((m) => m.CierrePeriodosComponent) },
  { path: 'calificaciones/boletines', title: 'Boletines', loadComponent: () => import('./calificaciones/boletines.component').then((m) => m.BoletinesComponent) },

  { path: 'reportes', pathMatch: 'full', redirectTo: 'reportes/rendimiento' },
  { path: 'reportes/rendimiento', title: 'Rendimiento académico', loadComponent: () => import('./reportes/rendimiento.component').then((m) => m.RendimientoComponent) },
  { path: 'reportes/asistencia', title: 'Reporte de asistencia', loadComponent: () => import('./reportes/asistencia-reporte.component').then((m) => m.AsistenciaReporteComponent) },
  { path: 'reportes/puntualidad', title: 'Puntualidad del personal', loadComponent: () => import('./reportes/puntualidad.component').then((m) => m.PuntualidadComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../comunicados/comunicados.component').then((m) => m.ComunicadosComponent) },
  { path: 'institucion', title: 'Datos de la institución', loadComponent: () => import('./institucion/datos/datos-institucion.component').then((m) => m.DatosInstitucionComponent) },
  { path: 'institucion/jornada', title: 'Jornada escolar', loadComponent: () => import('./institucion/jornada/jornada.component').then((m) => m.JornadaComponent) },
  { path: 'institucion/horario-laboral', title: 'Horario laboral', loadComponent: () => import('./institucion/horario-laboral/horario-laboral.component').then((m) => m.HorarioLaboralComponent) },
] satisfies Routes;
