import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSessionService } from './api-session.service';
import { SessionService } from '../auth/session.service';
import { readApiError } from './api-error';

const authPrefix = `${environment.API_URL}/auth/`;

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${environment.API_URL}/`)) return next(request);

  const session = inject(ApiSessionService);
  const sessionState = inject(SessionService);
  if (request.url.startsWith(authPrefix)) return next(request);
  const token = session.accessToken();
  const authenticatedRequest = token ? withBearer(request, token) : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!isExpiredSession(error)) return throwError(() => error);
      return session.refreshSession().pipe(
        catchError((refreshError: unknown) => {
          sessionState.expireSession(readApiError(refreshError).code === 'sesion_reemplazada' ? 'sesion_reemplazada' : undefined);
          return throwError(() => refreshError);
        }),
        switchMap((response) => {
          sessionState.applyApiSession(response);
          return next(withBearer(request, response.accessToken)).pipe(
            catchError((retryError: unknown) => {
              if (isExpiredSession(retryError)) sessionState.expireSession(readApiError(retryError).code === 'sesion_reemplazada' ? 'sesion_reemplazada' : undefined);
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};

function withBearer(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isExpiredSession(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 401;
}
