import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSessionService } from './api-session.service';

const authPrefix = `${environment.API_URL}/auth/`;

export const apiAuthInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${environment.API_URL}/`)) return next(request);

  const session = inject(ApiSessionService);
  if (request.url.startsWith(authPrefix)) return next(request);
  const token = session.accessToken();
  const authenticatedRequest = token ? withBearer(request, token) : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (!isExpiredSession(error)) return throwError(() => error);
      return session.refresh().pipe(
        catchError((refreshError: unknown) => {
          session.clearAccessToken();
          return throwError(() => refreshError);
        }),
        switchMap((newToken) => next(withBearer(request, newToken))),
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
