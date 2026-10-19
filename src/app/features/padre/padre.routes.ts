import { Routes } from '@angular/router';
import { proximamente } from '../../core/routing/proximamente';

// /:espacio/padre/... (padre o tutor legal, en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'Resumen', loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent) },
  proximamente('hijos', 'Mis hijos'),
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('../calificaciones/mis-calificaciones.component').then((m) => m.MisCalificacionesComponent) },
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('../asistencia/mi-asistencia.component').then((m) => m.MiAsistenciaComponent) },
  { path: 'horario', title: 'Horario', loadComponent: () => import('../horario/mi-horario.component').then((m) => m.MiHorarioComponent) },
  proximamente('comunicados', 'Comunicados', 'Avisos de la institución y de los docentes.'),
] satisfies Routes;
