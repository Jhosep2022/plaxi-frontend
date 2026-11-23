import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { rememberReturnUrl, SessionService } from '../auth/session.service';
import type { SpaceRole } from '../models/space.model';

// The role whose inbox opens a shared notice: a parent or student reads it; staff see it among the sent ones
const PREFERRED: SpaceRole[] = ['padre', 'estudiante', 'docente', 'secretaria', 'direccion'];

// /comunicado/:espacio/:id is the link of "Compartir por WhatsApp". Without a session it signs in first
// and comes back; with one, it opens the notice in the inbox of the person's role in that school.
export const announcementLinkGuard: CanActivateFn = (route) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const slug = route.paramMap.get('espacio') ?? '';
  const id = Number(route.paramMap.get('id'));
  const self = `/comunicado/${encodeURIComponent(slug)}/${id}`;
  if (!session.isAuthenticated()) {
    rememberReturnUrl(self);
    return router.createUrlTree(['/auth/login']);
  }
  const pending = session.pendingStep();
  if (pending) {
    rememberReturnUrl(self);
    return router.parseUrl(pending);
  }
  const roles = session.memberships().filter((membership) => membership.espacio.slug === slug).map((membership) => membership.rol);
  const role = PREFERRED.find((entry) => roles.includes(entry));
  if (!role || !Number.isInteger(id) || id <= 0) return router.parseUrl(session.postLoginRoute());
  return router.createUrlTree(['/', slug, role, 'comunicados'], { queryParams: { c: id } });
};
