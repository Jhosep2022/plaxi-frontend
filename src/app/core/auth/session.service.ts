import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SpaceService } from '../../services/space.service';
import { Space, Membership, SpaceRole } from '../models/space.model';

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
  private router = inject(Router);
  private authService = inject(AuthService);
  private spaceService = inject(SpaceService);

  readonly userId = signal<number | null>(readNumber(USER_ID_STORAGE_KEY));
  readonly isPlatformAdmin = computed(() => this.authService.isPlatformAdmin(this.userId()));
  readonly memberships = signal<Membership[]>(readJson<Membership[]>(MEMBERSHIPS_STORAGE_KEY) ?? []);
  readonly activeSpace = signal<Space | null>(null);

  readonly isAuthenticated = computed(() => this.userId() !== null);
  readonly activeMembership = computed(() => {
    const space = this.activeSpace();
    return space ? this.memberships().find((m) => m.espacio.id === space.id) ?? null : null;
  });
  readonly activeRole = computed<SpaceRole | null>(() => this.activeMembership()?.rol ?? null);

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
    this.authService.logout();
    this.userId.set(null);
    this.memberships.set([]);
    this.activeSpace.set(null);
    [USER_ID_STORAGE_KEY, MEMBERSHIPS_STORAGE_KEY, LEGACY_USER_ID_STORAGE_KEY, LEGACY_ROLE_STORAGE_KEY].forEach(removeStorage);
    this.router.navigate(['/auth/login']);
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

function readNumber(key: string): number | null {
  const value = Number(readStorage(key));
  return Number.isFinite(value) && value > 0 ? value : null;
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
