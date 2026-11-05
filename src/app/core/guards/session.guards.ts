import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { SpaceRole, SpaceType } from '../models/space.model';
import { SessionService } from '../auth/session.service';

// Require an authenticated session.
export const authGuard: CanMatchFn = () => {
  const session = inject(SessionService);
  return session.isAuthenticated() || inject(Router).createUrlTree(['/auth/login']);
};

// Redirect authenticated users away from sign-in pages.
export const guestGuard: CanMatchFn = () => {
  const session = inject(SessionService);
  return !session.isAuthenticated() || inject(Router).parseUrl(session.postLoginRoute());
};

// Match a space only when the user belongs to it.
export const spaceGuard: CanMatchFn = (_route, segments) => {
  const session = inject(SessionService);
  const membership = session.membershipBySlug(segments[0]?.path);
  if (!membership) return false;
  session.activateSpace(membership);
  return true;
};

// Require a role in the active space.
export const roleGuard = (...roles: SpaceRole[]): CanActivateFn => () => {
  const role = inject(SessionService).activeRole();
  return (role !== null && roles.includes(role)) || inject(Router).createUrlTree(['/no-autorizado']);
};

// Require a space type for role-specific features.
export const spaceTypeGuard = (type: SpaceType): CanActivateFn => () => {
  return inject(SessionService).activeSpace()?.tipo === type || inject(Router).createUrlTree(['/no-autorizado']);
};

// Redirect the empty root and space routes.
export const redirectHomeGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);
  if (!session.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  const membership = session.activeMembership();
  return router.parseUrl(membership ? session.homeRoute(membership) : session.postLoginRoute());
};

// Platform admins are not members of a space.
export const platformAdminGuard: CanMatchFn = () => {
  const session = inject(SessionService);
  if (!session.isAuthenticated()) return inject(Router).createUrlTree(['/auth/login']);
  return session.isPlatformAdmin() || inject(Router).createUrlTree(['/no-autorizado']);
};

// Platform accounts cannot use member screens.
export const spaceMemberGuard: CanMatchFn = () => {
  return !inject(SessionService).isPlatformAdmin() || inject(Router).createUrlTree(['/admin']);
};
