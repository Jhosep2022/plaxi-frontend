import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { SpaceService } from '../../services/space.service';
import { DEFAULT_GRADING_SCALE, Space, Membership, SpaceRole } from '../models/space.model';
import { ApiSessionService } from '../api/api-session.service';
import { AuthApiService, type ApiSessionResponse } from '../api/auth-api.service';
import { environment } from '../../../environments/environment';
import { readApiError } from '../api/api-error';

const USER_ID_STORAGE_KEY = 'idUsuario';
const MEMBERSHIPS_STORAGE_KEY = 'membresias';
const DEFAULT_SPACE_STORAGE_KEY = 'espacioPredeterminado'; // Existing persisted key; maps user IDs to slugs.

// Existing storage keys still read by older components.
const LEGACY_USER_ID_STORAGE_KEY = 'userId';
const LEGACY_ROLE_STORAGE_KEY = 'userRole';
const LEGACY_ROLE: Record<SpaceRole, string> = { direccion: '1', estudiante: '2', docente: '3', padre: '4' };

// Source of truth for the current user, memberships, active space, and role.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private spaceService = inject(SpaceService);
  private authApi = inject(AuthApiService);
  private apiSession = inject(ApiSessionService);

  readonly userId = signal<number | null>(null);
  readonly isPlatformAdmin = signal(false);
  readonly passwordChangeRequired = signal(false);
  readonly memberships = signal<Membership[]>([]);
  readonly activeSpace = signal<Space | null>(null);

  readonly isAuthenticated = computed(() => this.apiSession.accessToken() !== null);
  readonly activeMembership = computed(() => {
    const space = this.activeSpace();
    return space ? this.memberships().find((m) => m.espacio.id === space.id) ?? null : null;
  });
  readonly activeRole = computed<SpaceRole | null>(() => this.activeMembership()?.rol ?? null);

  restoreSession(): Observable<void> {
    return this.apiSession.refreshSession().pipe(
      tap((response) => this.applyApiSession(response)),
      map(() => undefined),
      catchError(() => {
        this.clearLocalSession();
        return of(undefined);
      }),
    );
  }

  // Al volver a una pestaña protegida, comprueba si otra sesión de estudiante la reemplazó.
  checkSessionOnFocus(): void {
    if (!this.isAuthenticated()) return;
    this.http.get(`${environment.API_URL}/perfil`).subscribe({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401 && this.isAuthenticated()) {
          this.expireSession(readApiError(error).code === 'sesion_reemplazada' ? 'sesion_reemplazada' : undefined);
        }
      },
    });
  }

  applyApiSession(response: ApiSessionResponse): void {
    this.apiSession.setAccessToken(response.accessToken);
    this.userId.set(response.usuario.id);
    this.isPlatformAdmin.set(response.usuario.esAdmin);
    this.passwordChangeRequired.set(response.usuario.passwordChangeRequired);
    this.memberships.set(response.membresias.map((membership) => ({
      espacio: { ...membership.espacio, escala: DEFAULT_GRADING_SCALE },
      rol: membership.rol as SpaceRole,
    })));
    writeStorage(USER_ID_STORAGE_KEY, String(response.usuario.id));
    writeStorage(LEGACY_USER_ID_STORAGE_KEY, String(response.usuario.id));
    writeStorage(MEMBERSHIPS_STORAGE_KEY, JSON.stringify(this.memberships()));
  }

  // Store the session after sign-in and load the user's memberships.
  startSession(userId: number): Observable<Membership[]> {
    return this.spaceService.getMemberships(userId).pipe(
      tap((memberships) => {
        this.userId.set(userId);
        this.memberships.set(memberships);
        writeStorage(USER_ID_STORAGE_KEY, String(userId));
        writeStorage(LEGACY_USER_ID_STORAGE_KEY, String(userId));
        writeStorage(MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships));
      })
    );
  }

  signOut(): void {
    this.authApi.logout().subscribe({ error: () => undefined });
    this.clearLocalSession();
    void this.router.navigate(['/auth/login']);
  }

  expireSession(reason?: 'sesion_reemplazada'): void {
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/') && !currentUrl.startsWith('/auth/')) rememberReturnUrl(currentUrl);
    if (reason) writeSessionNotice(reason);
    this.clearLocalSession();
    void this.router.navigate(['/auth/login']);
  }

  finishTemporaryPasswordChange(): void {
    this.passwordChangeRequired.set(false);
  }

  private clearLocalSession(): void {
    this.apiSession.clearAccessToken();
    this.userId.set(null);
    this.isPlatformAdmin.set(false);
    this.passwordChangeRequired.set(false);
    this.memberships.set([]);
    this.activeSpace.set(null);
    [USER_ID_STORAGE_KEY, MEMBERSHIPS_STORAGE_KEY, LEGACY_USER_ID_STORAGE_KEY, LEGACY_ROLE_STORAGE_KEY].forEach(removeStorage);
  }

  membershipBySlug(slug: string | null | undefined): Membership | null {
    return this.memberships().find((m) => m.espacio.slug === slug) ?? null;
  }

  activateSpace(membership: Membership): void {
    if (this.activeSpace()?.id !== membership.espacio.id) {
      this.activeSpace.set(membership.espacio);
    }
    writeStorage(LEGACY_ROLE_STORAGE_KEY, LEGACY_ROLE[membership.rol]);
  }

  // Keep the sidebar and space selector current without signing in again.
  renameSpace(spaceId: number, name: string): void {
    const memberships = this.memberships().map((m) => (m.espacio.id === spaceId ? { ...m, espacio: { ...m.espacio, nombre: name } } : m));
    this.memberships.set(memberships);
    writeStorage(MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships));
    const activeSpace = this.activeSpace();
    if (activeSpace?.id === spaceId) this.activeSpace.set({ ...activeSpace, nombre: name });
  }

  // Remove a space after the user leaves it.
  removeMembership(spaceId: number): void {
    const slug = this.memberships().find((m) => m.espacio.id === spaceId)?.espacio.slug;
    if (slug && this.defaultSpace() === slug) this.setDefaultSpace(null);
    const memberships = this.memberships().filter((m) => m.espacio.id !== spaceId);
    this.memberships.set(memberships);
    writeStorage(MEMBERSHIPS_STORAGE_KEY, JSON.stringify(memberships));
  }

  // Preferred space to open after sign-in; null opens the selector.
  defaultSpace(): string | null {
    const id = this.userId();
    return id ? readJson<Record<number, string>>(DEFAULT_SPACE_STORAGE_KEY)?.[id] ?? null : null;
  }

  setDefaultSpace(slug: string | null): void {
    const id = this.userId();
    if (!id) return;
    const preferences = readJson<Record<number, string>>(DEFAULT_SPACE_STORAGE_KEY) ?? {};
    if (slug) preferences[id] = slug;
    else delete preferences[id];
    writeStorage(DEFAULT_SPACE_STORAGE_KEY, JSON.stringify(preferences));
  }

  // Home route for a role within a space.
  homeRoute(membership: Membership): string {
    return `/${membership.espacio.slug}/${membership.rol}/inicio`;
  }

  // Choose a return URL, preferred space, or selector after sign-in.
  postLoginRoute(): string {
    if (this.passwordChangeRequired()) return '/cambiar-clave-temporal';
    // Return to the original link, such as a course invitation.
    const returnUrl = consumeReturnUrl();
    if (returnUrl) return returnUrl;
    if (this.isPlatformAdmin()) return '/admin';
    const memberships = this.memberships();
    const preferredMembership = this.membershipBySlug(this.defaultSpace());
    if (preferredMembership) return this.homeRoute(preferredMembership);
    return memberships.length === 1 ? this.homeRoute(memberships[0]) : '/espacios';
  }

  // Build a route within the active space.
  spaceRoute(...segments: (string | number)[]): (string | number)[] {
    return ['/', this.activeSpace()?.slug ?? '', ...segments];
  }

  // Build a route within the active role's area.
  roleRoute(...segments: (string | number)[]): (string | number)[] {
    return this.spaceRoute(this.activeRole() ?? '', ...segments);
  }
}

const RETURN_URL_STORAGE_KEY = 'volverA';
const SESSION_NOTICE_STORAGE_KEY = 'avisoSesion';

function writeSessionNotice(reason: string): void {
  try { sessionStorage.setItem(SESSION_NOTICE_STORAGE_KEY, reason); } catch { /* Storage may be unavailable. */ }
}

export function consumeSessionNotice(): string | null {
  try {
    const reason = sessionStorage.getItem(SESSION_NOTICE_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_NOTICE_STORAGE_KEY);
    return reason;
  } catch { return null; }
}

// Save a return URL for the next sign-in.
export function rememberReturnUrl(url: string): void {
  try {
    sessionStorage.setItem(RETURN_URL_STORAGE_KEY, url);
  } catch {
    // Continue to the home page when storage is unavailable.
  }
}

// Inspect the return URL without consuming it.
export function peekReturnUrl(): string | null {
  try {
    return sessionStorage.getItem(RETURN_URL_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Discard the return URL after registration resolves the invitation.
export function forgetReturnUrl(): void {
  try {
    sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
  } catch {
    // The return URL is already absent.
  }
}

function consumeReturnUrl(): string | null {
  try {
    const url = sessionStorage.getItem(RETURN_URL_STORAGE_KEY);
    sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
    return url;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(readStorage(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The session remains in memory when storage is unavailable.
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // The key is already absent.
  }
}
