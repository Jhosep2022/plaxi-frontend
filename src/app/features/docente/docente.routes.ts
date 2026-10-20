import { Routes } from '@angular/router';
import { tipoEspacioGuard } from '../../core/guards/session.guards';

// /:espacio/docente/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent),
  },

  // Contenido digital: ahora vive dentro de cada aula (las rutas antiguas redirigen)
  { path: 'contenido/cursos', pathMatch: 'full', redirectTo: 'clases' },
  { path: 'contenido/cursos/nuevo', redirectTo: 'cursos/nuevo' },
  { path: 'cursos/nuevo', title: 'Crear curso', canActivate: [tipoEspacioGuard('academia')], data: { crear: true }, loadComponent: () => import('../aulas/mis-aulas.component').then((m) => m.MisAulasComponent) },

  // Colegio: clases asignadas (materia + paralelo)
  { path: 'clases', title: 'Mis clases', loadComponent: () => import('../aulas/mis-aulas.component').then((m) => m.MisAulasComponent) },
  { path: 'clases/:asignacionId/quiz/:quizId', title: 'Quiz', loadComponent: () => import('../aulas/docente/quiz-editor.component').then((m) => m.QuizEditorComponent) },
  { path: 'clases/:asignacionId/quiz/:quizId/resultados', title: 'Resultados del quiz', loadComponent: () => import('../aulas/docente/quiz-resultados.component').then((m) => m.QuizResultadosComponent) },
  { path: 'clases/:asignacionId', title: 'Aula', loadComponent: () => import('../aulas/docente/aula-docente.component').then((m) => m.AulaDocenteComponent) },
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../horario/mi-horario.component').then((m) => m.MiHorarioComponent) },
  { path: 'marcacion', title: 'Marcación', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('./marcacion/marcacion.component').then((m) => m.MarcacionComponent) },
  { path: 'marcacion/historial', title: 'Mi historial de marcaciones', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('./marcacion/historial-marcacion.component').then((m) => m.HistorialMarcacionComponent) },

  // Academia: estudiantes, invitaciones y sesiones en vivo
  { path: 'estudiantes', title: 'Estudiantes', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../aulas/docente/estudiantes-academia.component').then((m) => m.EstudiantesAcademiaComponent) },
  { path: 'estudiantes/solicitudes', title: 'Solicitudes de inscripción', canActivate: [tipoEspacioGuard('academia')], data: { tab: 'solicitudes' }, loadComponent: () => import('../aulas/docente/estudiantes-academia.component').then((m) => m.EstudiantesAcademiaComponent) },
  { path: 'invitaciones', title: 'Links de invitación', canActivate: [tipoEspacioGuard('academia')], data: { tab: 'invitaciones' }, loadComponent: () => import('../aulas/docente/estudiantes-academia.component').then((m) => m.EstudiantesAcademiaComponent) },
  { path: 'sesiones', title: 'Sesiones en vivo', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../academia/sesiones-docente.component').then((m) => m.SesionesDocenteComponent) },

  // Seguimiento (ambos tipos de espacio)
  { path: 'tareas', title: 'Tareas', loadComponent: () => import('./tareas/tareas-docente.component').then((m) => m.TareasDocenteComponent) },
  { path: 'tareas/:tareaId', title: 'Revisar tarea', loadComponent: () => import('./tareas/detalle-tarea.component').then((m) => m.DetalleTareaComponent) },
  { path: 'comunicados', title: 'Comunicados', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('../comunicados/comunicados.component').then((m) => m.ComunicadosComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('./asistencia/tomar-asistencia.component').then((m) => m.TomarAsistenciaComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('./calificaciones/registrar-notas.component').then((m) => m.RegistrarNotasComponent) },
] satisfies Routes;
