import { Routes } from '@angular/router';
import { tipoEspacioGuard } from '../../core/guards/session.guards';
import { proximamente } from '../../core/routing/proximamente';

// /:espacio/docente/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent),
  },

  // Contenido digital: cursos -> lecciones -> temas (colegio y academia)
  {
    path: 'contenido/cursos',
    children: [
      { path: '', title: 'Mis cursos', loadComponent: () => import('../../components/course-list/course-list.component').then((m) => m.CourseListComponent) },
      { path: 'nuevo', title: 'Crear curso', loadComponent: () => import('../../components/course-form/course-form.component').then((m) => m.CourseFormComponent) },
      {
        path: ':cursoId',
        children: [
          { path: '', title: 'Curso', loadComponent: () => import('../../components/course-details-tutor/course-details-tutor.component').then((m) => m.CourseDetailsTutorComponent) },
          { path: 'editar', title: 'Editar curso', loadComponent: () => import('../../components/course-edit-tutor/course-edit-tutor.component').then((m) => m.CourseEditTutorComponent) },
          { path: 'lecciones/nueva', title: 'Crear lección', loadComponent: () => import('../../components/lesson-form/lesson-form.component').then((m) => m.LessonFormComponent) },
          {
            path: 'lecciones/:leccionId',
            children: [
              { path: '', title: 'Lección', loadComponent: () => import('../../components/lesson-details-tutor/lesson-details-tutor.component').then((m) => m.LessonDetailsTutorComponent) },
              { path: 'editar', title: 'Editar lección', loadComponent: () => import('../../components/lesson-edit/lesson-edit.component').then((m) => m.LessonEditComponent) },
              { path: 'temas/nuevo', title: 'Crear tema', loadComponent: () => import('../../components/tema-form/tema-form.component').then((m) => m.TemaFormComponent) },
              { path: 'temas/:temaId', title: 'Tema', loadComponent: () => import('../../components/tema-details-tutor/tema-details-tutor.component').then((m) => m.TemaDetailsTutorComponent) },
              { path: 'temas/:temaId/editar', title: 'Editar tema', loadComponent: () => import('../../components/theme-edit/theme-edit.component').then((m) => m.ThemeEditComponent) },
            ],
          },
        ],
      },
    ],
  },

  // Colegio: clases asignadas (materia + paralelo)
  proximamente('clases', 'Mis clases', 'Tus materias y paralelos asignados, con sus estudiantes.'),
  { path: 'horario', title: 'Mi horario', loadComponent: () => import('../horario/mi-horario.component').then((m) => m.MiHorarioComponent) },
  { path: 'marcacion', title: 'Marcación', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('./marcacion/marcacion.component').then((m) => m.MarcacionComponent) },
  { path: 'marcacion/historial', title: 'Mi historial de marcaciones', canActivate: [tipoEspacioGuard('colegio')], loadComponent: () => import('./marcacion/historial-marcacion.component').then((m) => m.HistorialMarcacionComponent) },

  // Academia: estudiantes, invitaciones y sesiones en vivo
  proximamente('estudiantes', 'Estudiantes', 'Estudiantes inscritos en tus cursos.'),
  proximamente('estudiantes/solicitudes', 'Solicitudes de inscripción'),
  proximamente('invitaciones', 'Links de invitación', 'Genera links para que tus estudiantes se unan a tus cursos.', { canActivate: [tipoEspacioGuard('academia')] }),
  proximamente('sesiones', 'Sesiones en vivo', 'Programa tus clases en vivo con su link de Meet o Zoom.', { canActivate: [tipoEspacioGuard('academia')] }),

  // Seguimiento (ambos tipos de espacio)
  { path: 'asistencia', title: 'Asistencia', loadComponent: () => import('./asistencia/tomar-asistencia.component').then((m) => m.TomarAsistenciaComponent) },
  { path: 'calificaciones', title: 'Calificaciones', loadComponent: () => import('./calificaciones/registrar-notas.component').then((m) => m.RegistrarNotasComponent) },
] satisfies Routes;
