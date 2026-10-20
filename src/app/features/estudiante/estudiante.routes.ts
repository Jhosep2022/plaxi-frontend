import { Routes } from '@angular/router';
import { tipoEspacioGuard } from '../../core/guards/session.guards';

// /:espacio/estudiante/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent),
  },

  // Catálogo de la academia y redirección de la ruta antigua de cursos
  { path: 'catalogo', title: 'Catálogo', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../aulas/estudiante/catalogo.component').then((m) => m.CatalogoComponent) },
  { path: 'cursos', pathMatch: 'full', redirectTo: 'aulas' },

  { path: 'aulas', title: 'Mis materias', loadComponent: () => import('../aulas/mis-aulas.component').then((m) => m.MisAulasComponent) },
  { path: 'aulas/:aulaId/quiz/:quizId', title: 'Quiz', loadComponent: () => import('../aulas/estudiante/responder-quiz.component').then((m) => m.ResponderQuizComponent) },
  { path: 'aulas/:aulaId', title: 'Aula', loadComponent: () => import('../aulas/estudiante/aula-estudiante.component').then((m) => m.AulaEstudianteComponent) },
  { path: 'sesiones', title: 'Sesiones en vivo', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../academia/sesiones-estudiante.component').then((m) => m.SesionesEstudianteComponent) },
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../horario/mi-horario.component').then((m) => m.MiHorarioComponent) },
  { path: 'tareas', title: 'Mis tareas', loadComponent: () => import('../tareas/mis-tareas.component').then((m) => m.MisTareasComponent) },
  { path: 'calificaciones', title: 'Mis calificaciones', loadComponent: () => import('../calificaciones/mis-calificaciones.component').then((m) => m.MisCalificacionesComponent) },
  { path: 'comunicados', title: 'Comunicados', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('../comunicados/comunicados.component').then((m) => m.ComunicadosComponent) },
  { path: 'asistencia', title: 'Mi asistencia', loadComponent: () => import('../asistencia/mi-asistencia.component').then((m) => m.MiAsistenciaComponent) },
] satisfies Routes;
