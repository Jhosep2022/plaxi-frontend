import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export default [{
  path: '', component: AdminLayoutComponent, children: [
    { path: '', pathMatch: 'full', redirectTo: 'overview' },
    { path: 'overview', title: 'Resumen de la plataforma', loadComponent: () => import('./admin-overview.component').then((m) => m.AdminOverviewComponent) },
    { path: 'schools', title: 'Colegios', loadComponent: () => import('./admin-spaces.component').then((m) => m.AdminSpacesComponent), data: { type: 'school' } },
    { path: 'academies', title: 'Academias', loadComponent: () => import('./admin-spaces.component').then((m) => m.AdminSpacesComponent), data: { type: 'academy' } },
    { path: 'requests', title: 'Solicitudes de colegios', loadComponent: () => import('./admin-requests.component').then((m) => m.AdminRequestsComponent) },
    { path: 'users', title: 'Usuarios', loadComponent: () => import('./admin-users.component').then((m) => m.AdminUsersComponent) },
    { path: 'storage', title: 'Almacenamiento', loadComponent: () => import('./admin-storage.component').then((m) => m.AdminStorageComponent) },
    { path: 'audit', title: 'Registro de acciones', loadComponent: () => import('./admin-audit.component').then((m) => m.AdminAuditComponent) },
  ],
}] satisfies Routes;
