import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { NavigationError, RedirectCommand, Router } from '@angular/router';
import { readApiError } from '../api/api-error';

// When a page cannot open (its code or its data failed to load), show the right status page instead of
// leaving the screen blank: no connection, too many requests or a server error. Other errors stay as they are.
export function handleNavigationError(navigationError: NavigationError): RedirectCommand | undefined {
  const router = inject(Router);
  const url = navigationError.url;
  if (url.startsWith('/error') || url.startsWith('/sin-conexion') || url.startsWith('/demasiados-intentos')) return undefined;
  const target = statusPageFor(navigationError.error);
  if (!target) return undefined;
  const params: Record<string, string> = { volver: url, ...target.params };
  return new RedirectCommand(router.createUrlTree([target.path], { queryParams: params }), { skipLocationChange: false });
}

function statusPageFor(error: unknown): { path: string; params?: Record<string, string> } | null {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  // The page code did not download: almost always a cut connection (or a new version deployed meanwhile)
  if (offline || isChunkLoadError(error)) return { path: '/sin-conexion' };
  if (!(error instanceof HttpErrorResponse)) return null;
  if (error.status === 0) return { path: '/sin-conexion' };
  if (error.status === 429) {
    const segundos = readApiError(error).retryAfterSeconds;
    return { path: '/demasiados-intentos', params: segundos ? { segundos: String(segundos) } : {} };
  }
  if (error.status >= 500) {
    const ref = readApiError(error).reference;
    return { path: '/error', params: ref ? { ref } : {} };
  }
  return null;
}

function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(text);
}
