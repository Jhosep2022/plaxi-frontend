import { Routes } from '@angular/router';

const perfil = () => import('./perfil.component').then((m) => m.PerfilComponent);

// /:espacio/perfil/... (común a todos los roles). Una sola página con pestañas; cada pestaña tiene su ruta.
export default [
  { path: '', title: 'Mi perfil', data: { tab: 'datos' }, loadComponent: perfil },
  { path: 'espacios', title: 'Mis espacios', data: { tab: 'espacios' }, loadComponent: perfil },
  { path: 'seguridad', title: 'Seguridad', data: { tab: 'seguridad' }, loadComponent: perfil },
  { path: 'preferencias', title: 'Preferencias', data: { tab: 'preferencias' }, loadComponent: perfil },
  { path: 'editar', redirectTo: '' },
] satisfies Routes;
