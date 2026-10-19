import { Routes } from '@angular/router';
import { authGuard, espacioGuard, guestGuard, redirigirInicioGuard, rolGuard } from './core/guards/session.guards';
import { proximamente } from './core/routing/proximamente';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';

// Estructura general:
//   /auth/...                       pantallas públicas (sin sidebar)
//   /unirse/:codigo                 link de invitación a una academia
//   /espacios                       elegir espacio (si el usuario tiene varios)
//   /:espacio/<rol>/...             todo lo demás, dentro de un colegio o academia
// Cada área de rol se carga de forma diferida y está protegida por su guard.
export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [redirigirInicioGuard], children: [] },

  {
    path: 'auth',
    canMatch: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes'),
  },

  proximamente('unirse/:codigo', 'Unirse a una academia', 'Aquí podrás aceptar la invitación que te compartió tu docente.'),

  {
    path: 'espacios',
    canMatch: [authGuard],
    title: 'Mis espacios',
    loadComponent: () => import('./shared/pages/seleccionar-espacio.component').then((m) => m.SeleccionarEspacioComponent),
  },

  {
    path: 'no-autorizado',
    title: 'Sin acceso',
    loadComponent: () => import('./shared/pages/no-autorizado.component').then((m) => m.NoAutorizadoComponent),
  },

  // Pantalla de QR para la entrada del colegio (pantalla completa, sin sidebar)
  {
    path: ':espacio/pantalla-marcacion/:puntoId',
    canMatch: [authGuard, espacioGuard],
    canActivate: [rolGuard('direccion')],
    title: 'Pantalla de marcación',
    loadComponent: () => import('./features/direccion/asistencia/pantalla-marcacion.component').then((m) => m.PantallaMarcacionComponent),
  },

  {
    path: ':espacio',
    canMatch: [authGuard, espacioGuard],
    component: AppLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', canActivate: [redirigirInicioGuard], children: [] },
      { path: 'perfil', loadChildren: () => import('./features/perfil/perfil.routes') },
      { path: 'docente', canActivate: [rolGuard('docente')], loadChildren: () => import('./features/docente/docente.routes') },
      { path: 'estudiante', canActivate: [rolGuard('estudiante')], loadChildren: () => import('./features/estudiante/estudiante.routes') },
      { path: 'direccion', canActivate: [rolGuard('direccion')], loadChildren: () => import('./features/direccion/direccion.routes') },
      { path: 'padre', canActivate: [rolGuard('padre')], loadChildren: () => import('./features/padre/padre.routes') },
    ],
  },

  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./shared/pages/no-encontrado.component').then((m) => m.NoEncontradoComponent),
  },
];
