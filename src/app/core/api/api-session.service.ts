import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Observable, defer, finalize, firstValueFrom, from, retry, shareReplay, tap, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSessionResponse } from './auth-api.service';
import { REFRESH_RETRY_DELAYS_MS, isTemporaryFailure } from './session-errors';

// Whether tabs renew the session one at a time with a browser lock (Web Locks). Tests turn it off
// to answer the refresh request right away.
export const REFRESH_TAB_LOCK = new InjectionToken<boolean>('REFRESH_TAB_LOCK', {
  providedIn: 'root',
  factory: () => typeof navigator !== 'undefined' && !!navigator.locks,
});

@Injectable({ providedIn: 'root' })
export class ApiSessionService {
  private readonly useTabLock = inject(REFRESH_TAB_LOCK);
  private readonly http = new HttpClient(inject(HttpBackend));
  private refreshRequest: Observable<ApiSessionResponse> | null = null;
  readonly accessToken = signal<string | null>(null);

  setAccessToken(token: string): void {
    this.accessToken.set(token);
  }

  clearAccessToken(): void {
    this.accessToken.set(null);
  }

  refreshSession(): Observable<ApiSessionResponse> {
    if (this.refreshRequest) return this.refreshRequest;

    const post = () => this.http.post<ApiSessionResponse>(`${environment.API_URL}/auth/refresh`, {}, { withCredentials: true });
    // Tabs share the refresh cookie: with a browser lock only one tab renews at a time, and the next one
    // already sends the new cookie (audit finding 14). Without Web Locks, the API's grace seconds cover it.
    const request$ = this.useTabLock ? defer(() => from(navigator.locks.request('aulix-refresh', () => firstValueFrom(post())))) : post();
    this.refreshRequest = request$.pipe(
      // A temporary failure (no signal, server error) is retried; an invalid session is not
      retry({
        count: REFRESH_RETRY_DELAYS_MS.length,
        delay: (error: unknown, attempt: number) =>
          isTemporaryFailure(error) ? timer(REFRESH_RETRY_DELAYS_MS[attempt - 1]) : throwError(() => error),
      }),
      tap((response) => this.setAccessToken(response.accessToken)),
      finalize(() => { this.refreshRequest = null; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest;
  }
}
