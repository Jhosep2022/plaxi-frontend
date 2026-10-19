import { Routes } from '@angular/router';
import { proximamente } from '../../core/routing/proximamente';

// /:espacio/padre/... (padre o tutor legal, en colegios)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  proximamente('inicio', 'Inicio', 'Resumen de tus hijos: asistencia de hoy, últimas notas y avisos.'),
  proximamente('hijos', 'Mis hijos'),
  proximamente('calificaciones', 'Calificaciones', 'Notas de tus hijos por materia y periodo.'),
  proximamente('asistencia', 'Asistencia', 'Asistencia, faltas y atrasos de tus hijos.'),
  proximamente('horario', 'Horario', 'Horario de clases de tus hijos.'),
  proximamente('comunicados', 'Comunicados', 'Avisos de la institución y de los docentes.'),
] satisfies Routes;
