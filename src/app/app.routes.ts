import { Routes } from '@angular/router';

// Cada pantalla se carga de forma diferida (lazy loading): su código se descarga
// solo cuando el usuario navega a esa ruta, lo que reduce el bundle inicial.
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Autenticación
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'registrar', loadComponent: () => import('./components/registrar-usuario/registrar-usuario.component').then(m => m.RegistrarUsuarioComponent) },
  { path: 'forgot-password', loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },

  // Inicio y perfil
  { path: 'home', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'perfil', loadComponent: () => import('./components/perfil/perfil.component').then(m => m.PerfilComponent) },
  { path: 'updateperfil', loadComponent: () => import('./components/updateperfil/updateperfil.component').then(m => m.UpdateperfilComponent) },

  // Cursos
  { path: 'my-courses', loadComponent: () => import('./components/course-list/course-list.component').then(m => m.CourseListComponent) },
  { path: 'create-course', loadComponent: () => import('./components/course-form/course-form.component').then(m => m.CourseFormComponent) },
  { path: 'course-categories', loadComponent: () => import('./components/course-category-list/course-category-list.component').then(m => m.CourseCategoryListComponent) },
  { path: 'course-details/:id', loadComponent: () => import('./components/course-details/course-details.component').then(m => m.CourseDetailsComponent) },
  { path: 'my-courses-student', loadComponent: () => import('./components/my-courses-student/my-courses-student.component').then(m => m.MyCoursesStudentComponent) },
  { path: 'course-details-tutor/:id', loadComponent: () => import('./components/course-details-tutor/course-details-tutor.component').then(m => m.CourseDetailsTutorComponent) },
  { path: 'course-edit-tutor/:id', loadComponent: () => import('./components/course-edit-tutor/course-edit-tutor.component').then(m => m.CourseEditTutorComponent) },

  // Lecciones
  { path: 'lesson-form/:id', loadComponent: () => import('./components/lesson-form/lesson-form.component').then(m => m.LessonFormComponent) },
  { path: 'lesson-details/:id', loadComponent: () => import('./components/lesson-details/lesson-details.component').then(m => m.LessonDetailsComponent) },
  { path: 'lesson-details-tutor/:id', loadComponent: () => import('./components/lesson-details-tutor/lesson-details-tutor.component').then(m => m.LessonDetailsTutorComponent) },
  { path: 'lesson-edit/:id', loadComponent: () => import('./components/lesson-edit/lesson-edit.component').then(m => m.LessonEditComponent) },

  // Temas
  { path: 'tema-form/:id', loadComponent: () => import('./components/tema-form/tema-form.component').then(m => m.TemaFormComponent) },
  { path: 'theme-edit/:id', loadComponent: () => import('./components/theme-edit/theme-edit.component').then(m => m.ThemeEditComponent) },
  { path: 'tema-details/:id', loadComponent: () => import('./components/tema-details/tema-details.component').then(m => m.TemaDetailsComponent) },
  { path: 'tema-details-tutor/:id', loadComponent: () => import('./components/tema-details-tutor/tema-details-tutor.component').then(m => m.TemaDetailsTutorComponent) },
];
