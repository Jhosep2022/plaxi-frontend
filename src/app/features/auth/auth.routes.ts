import { Routes } from '@angular/router';

// /auth/... (sin sidebar; solo para usuarios sin sesión). Todas comparten el marco con el panel de la marca.
export default [
  {
    path: '',
    loadComponent: () => import('./auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', title: 'Iniciar sesión', loadComponent: () => import('./login.component').then((m) => m.LoginComponent) },
      { path: 'registro', title: 'Crear cuenta', loadComponent: () => import('./registration.component').then((m) => m.RegistrationComponent) },
      { path: 'recuperar-contrasena', title: 'Recuperar contraseña', loadComponent: () => import('./forgot-password.component').then((m) => m.ForgotPasswordComponent) },
      { path: 'nueva-contrasena', title: 'Nueva contraseña', loadComponent: () => import('./reset-password.component').then((m) => m.ResetPasswordComponent) },
      { path: 'colegio', title: 'Aulix para colegios', loadComponent: () => import('./school-request.component').then((m) => m.SchoolRequestComponent) },
    ],
  },
] satisfies Routes;
