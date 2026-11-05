import { Routes } from '@angular/router';

// /:espacio/padre/... (padre o tutor legal, en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../overview/resumen.component').then((m) => m.ResumenComponent) },
  { path: 'hijos', title: 'Mis hijos', loadComponent: () => import('./mis-hijos.component').then((m) => m.MisHijosComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('../grades/my-grades.component').then((m) => m.MyGradesComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('../attendance/my-attendance.component').then((m) => m.MyAttendanceComponent) },
  { path: 'tareas', title: 'Tareas', loadComponent: () => import('../assignments/my-assignments.component').then((m) => m.MyAssignmentsComponent) },
  { path: 'horario', title: 'Horario', loadComponent: () => import('../schedule/my-schedule.component').then((m) => m.MyScheduleComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../announcements/announcements.component').then((m) => m.AnnouncementsComponent) },
] satisfies Routes;
