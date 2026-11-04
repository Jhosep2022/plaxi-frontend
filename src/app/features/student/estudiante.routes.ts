import { Routes } from '@angular/router';
import { tipoEspacioGuard } from '../../core/guards/session.guards';

// /:espacio/estudiante/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../overview/resumen.component').then((m) => m.ResumenComponent),
  },

  // Catálogo de la academia y redirección de la ruta antigua de cursos
  { path: 'catalogo', title: 'Catálogo', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../classrooms/student/catalogo.component').then((m) => m.CatalogoComponent) },
  { path: 'cursos', pathMatch: 'full', redirectTo: 'aulas' },

  { path: 'aulas', title: 'Mis materias', loadComponent: () => import('../classrooms/mis-aulas.component').then((m) => m.MisAulasComponent) },
  { path: 'aulas/:aulaId/quiz/:quizId', title: 'Quiz', loadComponent: () => import('../classrooms/student/responder-quiz.component').then((m) => m.ResponderQuizComponent) },
  { path: 'aulas/:aulaId', title: 'Aula', loadComponent: () => import('../classrooms/student/aula-estudiante.component').then((m) => m.AulaEstudianteComponent) },
  { path: 'sesiones', title: 'Sesiones en vivo', canActivate: [tipoEspacioGuard('academia')], loadComponent: () => import('../academy/sesiones-estudiante.component').then((m) => m.SesionesEstudianteComponent) },
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../schedule/mi-horario.component').then((m) => m.MiHorarioComponent) },
  { path: 'tareas', title: 'Mis tareas', loadComponent: () => import('../assignments/mis-tareas.component').then((m) => m.MisTareasComponent) },
  { path: 'calificaciones', title: 'Mis calificaciones', loadComponent: () => import('../grades/mis-calificaciones.component').then((m) => m.MisCalificacionesComponent) },
  { path: 'comunicados', title: 'Comunicados', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('../announcements/comunicados.component').then((m) => m.ComunicadosComponent) },
  { path: 'asistencia', title: 'Mi asistencia', loadComponent: () => import('../attendance/my-attendance.component').then((m) => m.MyAttendanceComponent) },
] satisfies Routes;
