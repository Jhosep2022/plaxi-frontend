import { HttpBackend, HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ConnectionProblem = 'sin_internet' | 'sin_respuesta' | null;

// Whether the device has internet and whether Aulix answers. With a weak signal at school both happen;
// the app shows a band (ConnectionBannerComponent) instead of losing what the person wrote (HU-ERR-05).
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly http = new HttpClient(inject(HttpBackend)); // without the interceptor: a ping never refreshes the session
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly unreachable = signal(false); // there is internet, but the last request could not reach the API
  readonly checking = signal(false);
  readonly problem = computed<ConnectionProblem>(() => (!this.online() ? 'sin_internet' : this.unreachable() ? 'sin_respuesta' : null));

  constructor() {
    if (typeof window === 'undefined') return;
    const goOnline = () => {
      this.online.set(true);
      void this.check();
    };
    const goOffline = () => this.online.set(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    });
  }

  // Called by the interceptor
  requestFailedWithoutAnswer(): void {
    this.unreachable.set(true);
  }

  requestAnswered(): void {
    if (this.unreachable()) this.unreachable.set(false);
  }

  // "Reintentar": asks the API whether it is back
  async check(): Promise<boolean> {
    this.checking.set(true);
    try {
      await firstValueFrom(this.http.get(`${environment.API_URL}/salud`));
      this.unreachable.set(false);
      return true;
    } catch {
      this.unreachable.set(true);
      return false;
    } finally {
      this.checking.set(false);
    }
  }
}
