import { Routes } from '@angular/router';

// /auth/... (sin sidebar; solo para usuarios sin sesión)
export default [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Iniciar sesión',
    loadComponent: () => import('../../components/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    loadComponent: () => import('../../components/registrar-usuario/registrar-usuario.component').then((m) => m.RegistrarUsuarioComponent),
  },
  {
    path: 'recuperar-contrasena',
    title: 'Recuperar contraseña',
    loadComponent: () => import('../../components/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
] satisfies Routes;
