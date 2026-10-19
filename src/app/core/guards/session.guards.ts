import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { Rol, TipoEspacio } from '../models/espacio.model';
import { SessionService } from '../auth/session.service';

// Solo usuarios con sesión; si no, al login
export const authGuard: CanMatchFn = () => {
  const session = inject(SessionService);
  return session.autenticado() || inject(Router).createUrlTree(['/auth/login']);
};

// Pantallas de autenticación: si ya hay sesión, se salta al inicio
export const guestGuard: CanMatchFn = () => {
  const session = inject(SessionService);
  return !session.autenticado() || inject(Router).parseUrl(session.rutaPostLogin());
};

// /:espacio solo coincide si el usuario pertenece a ese espacio (si no, cae en el 404)
export const espacioGuard: CanMatchFn = (_route, segments) => {
  const session = inject(SessionService);
  const membresia = session.membresiaPorSlug(segments[0]?.path);
  if (!membresia) return false;
  session.activarEspacio(membresia);
  return true;
};

// Exige un rol en el espacio activo
export const rolGuard = (...roles: Rol[]): CanActivateFn => () => {
  const rol = inject(SessionService).rolActivo();
  return (rol !== null && roles.includes(rol)) || inject(Router).createUrlTree(['/no-autorizado']);
};

// Exige un tipo de espacio (ej. la marcación docente solo existe en colegios)
export const tipoEspacioGuard = (tipo: TipoEspacio): CanActivateFn => () => {
  return inject(SessionService).espacioActivo()?.tipo === tipo || inject(Router).createUrlTree(['/no-autorizado']);
};

// Rutas vacías que solo redirigen: "/" y "/:espacio"
export const redirigirInicioGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.autenticado()) return router.createUrlTree(['/auth/login']);
  const membresia = session.membresiaActiva();
  return router.parseUrl(membresia ? session.rutaInicio(membresia) : session.rutaPostLogin());
};
