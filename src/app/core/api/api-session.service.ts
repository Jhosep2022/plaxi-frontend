import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, retry, shareReplay, tap, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSessionResponse } from './auth-api.service';
import { REFRESH_RETRY_DELAYS_MS, isTemporaryFailure } from './session-errors';

@Injectable({ providedIn: 'root' })
export class ApiSessionService {
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

    this.refreshRequest = this.http.post<ApiSessionResponse>(`${environment.API_URL}/auth/refresh`, {}, { withCredentials: true }).pipe(
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
