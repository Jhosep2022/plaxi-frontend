import { Routes } from '@angular/router';
import { platformAdminGuard, authGuard, spaceGuard, guestGuard, spaceMemberGuard, redirectHomeGuard, roleGuard, temporaryPasswordGuard, termsGuard } from './core/guards/session.guards';
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

  { path: 'cambiar-clave-temporal', canMatch: [temporaryPasswordGuard], title: 'Cambiar contraseña temporal', loadComponent: () => import('./features/auth/change-temporary-password.component').then((m) => m.ChangeTemporaryPasswordComponent) },

  // Inside the sign-in layout, like the other access screens
  {
    path: 'aceptar-terminos',
    canMatch: [termsGuard],
    loadComponent: () => import('./features/auth/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [{ path: '', title: 'Términos y privacidad', loadComponent: () => import('./features/legal/accept-terms.component').then((m) => m.AcceptTermsComponent) }],
  },

  // T07: the texts are public, so they can be read before creating an account
  { path: 'terminos', title: 'Términos de uso', loadComponent: () => import('./features/legal/terms-page.component').then((m) => m.TermsPageComponent) },
  { path: 'privacidad', title: 'Política de privacidad', loadComponent: () => import('./features/legal/privacy-page.component').then((m) => m.PrivacyPageComponent) },

  // Link of the email change: open with or without a session (it may be opened on another device)
  {
    path: 'confirmar-correo',
    loadComponent: () => import('./features/auth/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [{ path: '', title: 'Confirmar correo', loadComponent: () => import('./features/auth/confirm-email.component').then((m) => m.ConfirmEmailComponent) }],
  },

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

  // HU-ERR-03 and HU-ERR-05: a page could not open (server, connection or too many requests)
  {
    path: 'error',
    title: 'Algo falló',
    loadComponent: () => import('./shared/pages/server-error.component').then((m) => m.ServerErrorComponent),
  },
  {
    path: 'sin-conexion',
    title: 'Sin conexión',
    loadComponent: () => import('./shared/pages/offline.component').then((m) => m.OfflineComponent),
  },
  {
    path: 'demasiados-intentos',
    title: 'Demasiados intentos',
    loadComponent: () => import('./shared/pages/too-many-requests.component').then((m) => m.TooManyRequestsComponent),
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
