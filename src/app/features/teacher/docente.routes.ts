import { Routes } from '@angular/router';
import { tipoEspacioGuard } from '../../core/guards/session.guards';

// /:espacio/docente/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../overview/resumen.component').then((m) => m.ResumenComponent),
  },

  // Contenido digital: ahora vive dentro de cada aula (las rutas antiguas redirigen)
  { path: 'contenido/cursos', pathMatch: 'full', redirectTo: 'clases' },
  { path: 'contenido/cursos/nuevo', redirectTo: 'cursos/nuevo' },
  { path: 'cursos/nuevo', title: 'Crear curso', canActivate: [tipoEspacioGuard('academia')], data: { crear: true }, loadComponent: () => import('../classrooms/mis-aulas.component').then((m) => m.MisAulasComponent) },

  // Colegio: clases asignadas (materia + paralelo)
  { path: 'clases', title: 'Mis clases', loadComponent: () => import('../classrooms/mis-aulas.component').then((m) => m.MisAulasComponent) },
  { path: 'clases/:asignacionId/quiz/:quizId', title: 'Quiz', loadComponent: () => import('../classrooms/teacher/quiz-editor.component').then((m) => m.QuizEditorComponent) },
  { path: 'clases/:asignacionId/quiz/:quizId/resultados', title: 'Resultados del quiz', loadComponent: () => import('../classrooms/teacher/quiz-resultados.component').then((m) => m.QuizResultadosComponent) },
  { path: 'clases/:asignacionId', title: 'Aula', loadComponent: () => import('../classrooms/teacher/aula-docente.component').then((m) => m.AulaDocenteComponent) },
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../schedule/my-schedule.component').then((m) => m.MyScheduleComponent) },
  { path: 'marcacion', title: 'Marcación', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('./time-tracking/marcacion.component').then((m) => m.MarcacionComponent) },
  { path: 'marcacion/historial', title: 'Mi historial de marcaciones', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('./time-tracking/historial-marcacion.component').then((m) => m.HistorialMarcacionComponent) },

  // Academia: estudiantes, invitaciones y sesiones en vivo
  { path: 'estudiantes', title: 'Estudiantes', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../classrooms/teacher/estudiantes-academia.component').then((m) => m.EstudiantesAcademiaComponent) },
  { path: 'estudiantes/solicitudes', title: 'Solicitudes de inscripción', canActivate: [tipoEspacioGuard('academia')], data: { tab: 'solicitudes' }, loadComponent: () => import('../classrooms/teacher/estudiantes-academia.component').then((m) => m.EstudiantesAcademiaComponent) },
  { path: 'invitaciones', title: 'Links de invitación', canActivate: [tipoEspacioGuard('academia')], data: { tab: 'invitaciones' }, loadComponent: () => import('../classrooms/teacher/estudiantes-academia.component').then((m) => m.EstudiantesAcademiaComponent) },
  { path: 'sesiones', title: 'Sesiones en vivo', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../academy/sesiones-docente.component').then((m) => m.SesionesDocenteComponent) },

  // Seguimiento (ambos tipos de espacio)
  { path: 'tareas', title: 'Tareas', loadComponent: () => import('./assignments/tareas-docente.component').then((m) => m.TareasDocenteComponent) },
  { path: 'tareas/:tareaId', title: 'Revisar tarea', loadComponent: () => import('./assignments/detalle-tarea.component').then((m) => m.DetalleTareaComponent) },
  { path: 'comunicados', title: 'Comunicados', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('../announcements/comunicados.component').then((m) => m.ComunicadosComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('./attendance/tomar-asistencia.component').then((m) => m.TomarAsistenciaComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('./grades/registrar-notas.component').then((m) => m.RegistrarNotasComponent) },
] satisfies Routes;
