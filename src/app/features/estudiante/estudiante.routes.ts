import { Routes } from '@angular/router';
import { proximamente } from '../../core/routing/proximamente';

// /:espacio/estudiante/...
export default [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Resumen',
    loadComponent: () => import('../resumen/resumen.component').then((m) => m.ResumenComponent),
  },

  // Catálogo: explorar cursos e inscribirse
  {
    path: 'catalogo',
    children: [
      { path: '', title: 'Catálogo', loadComponent: () => import('../../components/course-category-list/course-category-list.component').then((m) => m.CourseCategoryListComponent) },
      { path: ':cursoId', title: 'Curso', loadComponent: () => import('../../components/course-details/course-details.component').then((m) => m.CourseDetailsComponent) },
    ],
  },

  // Mis cursos / materias -> lecciones -> temas
  {
    path: 'cursos',
    children: [
      { path: '', title: 'Mis cursos', loadComponent: () => import('../../components/my-courses-student/my-courses-student.component').then((m) => m.MyCoursesStudentComponent) },
      { path: ':cursoId', title: 'Curso', loadComponent: () => import('../../components/course-details/course-details.component').then((m) => m.CourseDetailsComponent) },
      { path: ':cursoId/lecciones/:leccionId', title: 'Lección', loadComponent: () => import('../../components/lesson-details/lesson-details.component').then((m) => m.LessonDetailsComponent) },
      { path: ':cursoId/lecciones/:leccionId/temas/:temaId', title: 'Tema', loadComponent: () => import('../../components/tema-details/tema-details.component').then((m) => m.TemaDetailsComponent) },
    ],
  },

  proximamente('horario', 'Mi horario', 'Tu horario semanal de clases.'),
  proximamente('tareas', 'Tareas', 'Tus tareas pendientes y entregadas.'),
  proximamente('calificaciones', 'Mis calificaciones', 'Tus notas por materia y periodo, y tu boletín.'),
  proximamente('asistencia', 'Mi asistencia', 'Tu porcentaje de asistencia, faltas y atrasos por materia.'),
] satisfies Routes;
