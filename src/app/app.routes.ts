import { Routes } from '@angular/router';
import { platformAdminGuard, authGuard, spaceGuard, guestGuard, spaceMemberGuard, redirectHomeGuard, roleGuard } from './core/guards/session.guards';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';

// Estructura general:
//   /auth/...                       pantallas públicas (sin sidebar)
//   /unirse/:codigo                 link de invitación a una academia
//   /espacios                       elegir espacio (si el usuario tiene varios)
//   /admin                          platform administration
//   /:espacio/<rol>/...             todo lo demás, dentro de un colegio o academia
// Cada área de rol se carga de forma diferida y está protegida por su guard.
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [redirectHomeGuard], children: [] },

  {
    path: 'auth',
    canMatch: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes'),
  },

  { path: 'unirse/:codigo', canMatch: [spaceMemberGuard], title: 'Unirse a un curso', loadComponent: () => import('./features/classrooms/join-course.component').then((m) => m.JoinCourseComponent) },

  {
    path: 'espacios',
    canMatch: [authGuard, spaceMemberGuard],
    title: 'Mis espacios',
    loadComponent: () => import('./shared/pages/select-space.component').then((m) => m.SelectSpaceComponent),
  },

  {
    path: 'no-autorizado',
    title: 'Sin acceso',
    loadComponent: () => import('./shared/pages/forbidden.component').then((m) => m.ForbiddenComponent),
  },

  // Pantalla de QR para la entrada del colegio (pantalla completa, sin sidebar)
  {
    path: ':espacio/pantalla-marcacion/:puntoId',
    canMatch: [authGuard, spaceMemberGuard, spaceGuard],
    canActivate: [roleGuard('direccion')],
    title: 'Pantalla de marcación',
    loadComponent: () => import('./features/management/attendance/time-clock-display.component').then((m) => m.TimeClockDisplayComponent),
  },

  { path: 'admin', canMatch: [platformAdminGuard], loadChildren: () => import('./features/admin/admin.routes') },

  {
    path: ':espacio',
    canMatch: [authGuard, spaceMemberGuard, spaceGuard],
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', canActivate: [redirectHomeGuard], children: [] },
      { path: 'perfil', loadChildren: () => import('./features/profile/profile.routes') },
      { path: 'docente', canActivate: [roleGuard('docente')], loadChildren: () => import('./features/teacher/teacher.routes') },
      { path: 'estudiante', canActivate: [roleGuard('estudiante')], loadChildren: () => import('./features/student/student.routes') },
      { path: 'direccion', canActivate: [roleGuard('direccion')], loadChildren: () => import('./features/management/management.routes') },
      { path: 'padre', canActivate: [roleGuard('padre')], loadChildren: () => import('./features/parent/parent.routes') },
    ],
  },

  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./shared/pages/not-found.component').then((m) => m.NotFoundComponent),
  },
];
