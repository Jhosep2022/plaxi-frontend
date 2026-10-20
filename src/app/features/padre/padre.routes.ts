import { Routes } from '@angular/router';

// /:espacio/padre/... (padre o tutor legal, en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent) },
  { path: 'hijos', title: 'Mis hijos', loadComponent: () => import('./mis-hijos.component').then((m) => m.MisHijosComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('../calificaciones/mis-calificaciones.component').then((m) => m.MisCalificacionesComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('../asistencia/mi-asistencia.component').then((m) => m.MiAsistenciaComponent) },
  { path: 'tareas', title: 'Tareas', loadComponent: () => import('../tareas/mis-tareas.component').then((m) => m.MisTareasComponent) },
  { path: 'horario', title: 'Horario', loadComponent: () => import('../horario/mi-horario.component').then((m) => m.MiHorarioComponent) },
  { path: 'comunicados', title: 'Comunicados', loadComponent: () => import('../comunicados/comunicados.component').then((m) => m.ComunicadosComponent) },
] satisfies Routes;
