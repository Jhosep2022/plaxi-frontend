import { Routes } from '@angular/router';
import { spaceTypeGuard } from '../../core/guards/session.guards';

// /:espacio/docente/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../overview/overview.component').then((m) => m.OverviewComponent),
  },

  // Contenido digital: ahora vive dentro de cada aula (las rutas antiguas redirigen)
  { path: 'contenido/cursos', pathMatch: 'full', redirectTo: 'clases' },
  { path: 'contenido/cursos/nuevo', redirectTo: 'cursos/nuevo' },
  { path: 'cursos/nuevo', title: 'Crear curso', canActivate: [spaceTypeGuard('academia')], data: { crear: true }, loadComponent: () => import('../classrooms/my-classrooms.component').then((m) => m.MyClassroomsComponent) },

  // Colegio: clases asignadas (materia + paralelo)
  { path: 'clases', title: 'Mis clases', loadComponent: () => import('../classrooms/my-classrooms.component').then((m) => m.MyClassroomsComponent) },
  { path: 'clases/:asignacionId/quiz/:quizId', title: 'Quiz', loadComponent: () => import('../classrooms/teacher/quiz-editor.component').then((m) => m.QuizEditorComponent) },
  { path: 'clases/:asignacionId/quiz/:quizId/resultados', title: 'Resultados del quiz', loadComponent: () => import('../classrooms/teacher/quiz-results.component').then((m) => m.QuizResultsComponent) },
  { path: 'clases/:asignacionId', title: 'Aula', loadComponent: () => import('../classrooms/teacher/teacher-classroom.component').then((m) => m.TeacherClassroomComponent) },
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../schedule/my-schedule.component').then((m) => m.MyScheduleComponent) },
  { path: 'marcacion', title: 'Marcación', canActivate: [spaceTypeGuard('colegio')], loadComponent: () => import('./time-tracking/time-tracking.component').then((m) => m.TimeTrackingComponent) },
  { path: 'marcacion/historial', title: 'Mi historial de marcaciones', canActivate: [spaceTypeGuard('colegio')], loadComponent: () => import('./time-tracking/time-tracking-history.component').then((m) => m.TimeTrackingHistoryComponent) },

  // Academia: estudiantes, invitaciones y sesiones en vivo
  { path: 'estudiantes', title: 'Estudiantes', canActivate: [spaceTypeGuard('academia')], loadComponent: () => import('../classrooms/teacher/academy-students.component').then((m) => m.AcademyStudentsComponent) },
  { path: 'estudiantes/solicitudes', title: 'Solicitudes de inscripción', canActivate: [spaceTypeGuard('academia')], data: { tab: 'solicitudes' }, loadComponent: () => import('../classrooms/teacher/academy-students.component').then((m) => m.AcademyStudentsComponent) },
  { path: 'invitaciones', title: 'Links de invitación', canActivate: [spaceTypeGuard('academia')], data: { tab: 'invitaciones' }, loadComponent: () => import('../classrooms/teacher/academy-students.component').then((m) => m.AcademyStudentsComponent) },
  { path: 'sesiones', title: 'Sesiones en vivo', canActivate: [spaceTypeGuard('academia')], loadComponent: () => import('../academy/teacher-sessions.component').then((m) => m.TeacherSessionsComponent) },

  // Seguimiento (ambos tipos de espacio)
  { path: 'tareas', title: 'Tareas', loadComponent: () => import('./assignments/teacher-assignments.component').then((m) => m.TeacherAssignmentsComponent) },
  { path: 'tareas/:tareaId', title: 'Revisar tarea', loadComponent: () => import('./assignments/assignment-detail.component').then((m) => m.AssignmentDetailComponent) },
  { path: 'comunicados', title: 'Comunicados', canActivate: [spaceTypeGuard('colegio')], loadComponent: () => import('../announcements/announcements.component').then((m) => m.AnnouncementsComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('./attendance/take-attendance.component').then((m) => m.TakeAttendanceComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('./grades/record-grades.component').then((m) => m.RecordGradesComponent) },
] satisfies Routes;
