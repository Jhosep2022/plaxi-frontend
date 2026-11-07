import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface RefreshResponse {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class ApiSessionService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private refreshRequest: Observable<string> | null = null;
  readonly accessToken = signal<string | null>(null);

  setAccessToken(token: string): void {
    this.accessToken.set(token);
  }

  clearAccessToken(): void {
    this.accessToken.set(null);
  }

  refresh(): Observable<string> {
    if (this.refreshRequest) return this.refreshRequest;

    this.refreshRequest = this.http.post<RefreshResponse>(`${environment.API_URL}/auth/refresh`, {}, { withCredentials: true }).pipe(
      map((response) => response.accessToken),
      tap((token) => this.setAccessToken(token)),
      finalize(() => { this.refreshRequest = null; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshRequest;
  }
}
