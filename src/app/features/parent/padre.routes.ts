import { Routes } from '@angular/router';

// /:espacio/padre/... (padre o tutor legal, en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../overview/resumen.component').then((m) => m.ResumenComponent) },
  { path: 'hijos', title: 'Mis hijos', loadComponent: () => import('./mis-hijos.component').then((m) => m.MisHijosComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('../grades/mis-calificaciones.component').then((m) => m.MisCalificacionesComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('../attendance/my-attendance.component').then((m) => m.MyAttendanceComponent) },
  { path: 'tareas', title: 'Tareas', loadComponent: () => import('../assignments/mis-tareas.component').then((m) => m.MisTareasComponent) },
  { path: 'horario', title: 'Horario', loadComponent: () => import('../schedule/my-schedule.component').then((m) => m.MyScheduleComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../announcements/comunicados.component').then((m) => m.ComunicadosComponent) },
] satisfies Routes;
