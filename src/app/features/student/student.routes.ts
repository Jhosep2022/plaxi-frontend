import { Routes } from '@angular/router';
import { spaceTypeGuard } from '../../core/guards/session.guards';

// /:espacio/estudiante/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../overview/overview.component').then((m) => m.OverviewComponent),
  },

  // Catálogo de la academia y redirección de la ruta antigua de cursos
  { path: 'catalogo', title: 'Catálogo', canActivate: [spaceTypeGuard('academia')], loadComponent: () => import('../classrooms/student/course-catalog.component').then((m) => m.CourseCatalogComponent) },
  { path: 'cursos', pathMatch: 'full', redirectTo: 'aulas' },

  { path: 'aulas', title: 'Mis materias', loadComponent: () => import('../classrooms/my-classrooms.component').then((m) => m.MyClassroomsComponent) },
  { path: 'aulas/:aulaId/quiz/:quizId', title: 'Quiz', loadComponent: () => import('../classrooms/student/take-quiz.component').then((m) => m.TakeQuizComponent) },
  { path: 'aulas/:aulaId', title: 'Aula', loadComponent: () => import('../classrooms/student/student-classroom.component').then((m) => m.StudentClassroomComponent) },
  { path: 'sesiones', title: 'Sesiones en vivo', canActivate: [spaceTypeGuard('academia')], loadComponent: () => import('../academy/student-sessions.component').then((m) => m.StudentSessionsComponent) },
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../schedule/my-schedule.component').then((m) => m.MyScheduleComponent) },
  { path: 'tareas', title: 'Mis tareas', loadComponent: () => import('../assignments/my-assignments.component').then((m) => m.MyAssignmentsComponent) },
  { path: 'calificaciones', title: 'Mis calificaciones', loadComponent: () => import('../grades/my-grades.component').then((m) => m.MyGradesComponent) },
  { path: 'comunicados', title: 'Comunicados', canActivate: [spaceTypeGuard('colegio')], loadComponent: () => import('../announcements/announcements.component').then((m) => m.AnnouncementsComponent) },
  { path: 'asistencia', title: 'Mi asistencia', loadComponent: () => import('../attendance/my-attendance.component').then((m) => m.MyAttendanceComponent) },
] satisfies Routes;
