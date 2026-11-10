import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSessionResponse } from './auth-api.service';

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
      tap((response) => this.setAccessToken(response.accessToken)),
      finalize(() => { this.refreshRequest = null; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest;
  }
}
