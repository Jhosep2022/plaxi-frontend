import { Routes } from '@angular/router';

// /auth/... (sin sidebar; solo para usuarios sin sesión). Todas comparten el marco con el panel de la marca.
export default [
  {
    path: '',
    loadComponent: () => import('./auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', title: 'Iniciar sesión', loadComponent: () => import('./login.component').then((m) => m.LoginComponent) },
      { path: 'registro', title: 'Crear cuenta', loadComponent: () => import('./registro.component').then((m) => m.RegistroComponent) },
      { path: 'recuperar-contrasena', title: 'Recuperar contraseña', loadComponent: () => import('./recuperar.component').then((m) => m.RecuperarComponent) },
      { path: 'nueva-contrasena', title: 'Nueva contraseña', loadComponent: () => import('./nueva-contrasena.component').then((m) => m.NuevaContrasenaComponent) },
      { path: 'colegio', title: 'QuizWiz para colegios', loadComponent: () => import('./solicitud-colegio.component').then((m) => m.SolicitudColegioComponent) },
    ],
  },
] satisfies Routes;
