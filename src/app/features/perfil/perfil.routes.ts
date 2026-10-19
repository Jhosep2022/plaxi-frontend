import { Routes } from '@angular/router';

// /:espacio/perfil/... (común a todos los roles)
export default [
  {
    path: '',
    title: 'Mi perfil',
    loadComponent: () => import('../../components/perfil/perfil.component').then((m) => m.PerfilComponent),
  },
  {
    path: 'editar',
    title: 'Editar perfil',
    loadComponent: () => import('../../components/updateperfil/updateperfil.component').then((m) => m.UpdateperfilComponent),
  },
] satisfies Routes;
