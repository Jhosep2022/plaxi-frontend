import { Route } from '@angular/router';

// Ruta de un módulo planificado que aún no se construye: muestra "Próximamente"
export function proximamente(path: string, titulo: string, descripcion?: string, extra: Partial<Route> = {}): Route {
  return {
    path,
    title: titulo,
    data: { titulo, ...(descripcion ? { descripcion } : {}) },
    loadComponent: () => import('../../shared/pages/proximamente.component').then((m) => m.ProximamenteComponent),
    ...extra,
  };
}
