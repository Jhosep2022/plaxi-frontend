import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { EspacioService } from '../../services/espacio.service';
import { Espacio, Membresia, Rol } from '../models/espacio.model';

const KEY_USUARIO = 'idUsuario';
const KEY_MEMBRESIAS = 'membresias';
const KEY_PREDETERMINADO = 'espacioPredeterminado'; // { [usuarioId]: slug }

// Claves antiguas que algunos componentes todavía leen de localStorage
const KEY_LEGACY_USER_ID = 'userId';
const KEY_LEGACY_ROL = 'userRole';
const LEGACY_ROL: Record<Rol, string> = { direccion: '1', estudiante: '2', docente: '3', padre: '4' };

// Única fuente de verdad de la sesión: usuario, espacios y espacio/rol activos
@Injectable({ providedIn: 'root' })
export class SessionService {
  private router = inject(Router);
  private authService = inject(AuthService);
  private espacioService = inject(EspacioService);

  readonly usuarioId = signal<number | null>(leerNumero(KEY_USUARIO));
  readonly membresias = signal<Membresia[]>(leerJson<Membresia[]>(KEY_MEMBRESIAS) ?? []);
  readonly espacioActivo = signal<Espacio | null>(null);

  readonly autenticado = computed(() => this.usuarioId() !== null);
  readonly membresiaActiva = computed(() => {
    const espacio = this.espacioActivo();
    return espacio ? this.membresias().find((m) => m.espacio.id === espacio.id) ?? null : null;
  });
  readonly rolActivo = computed<Rol | null>(() => this.membresiaActiva()?.rol ?? null);

  // Guarda la sesión tras un login exitoso y carga los espacios del usuario
  iniciarSesion(usuarioId: number): Observable<Membresia[]> {
    return this.espacioService.getMembresias(usuarioId).pipe(
      tap((membresias) => {
        this.usuarioId.set(usuarioId);
        this.membresias.set(membresias);
        guardar(KEY_USUARIO, String(usuarioId));
        guardar(KEY_LEGACY_USER_ID, String(usuarioId));
        guardar(KEY_MEMBRESIAS, JSON.stringify(membresias));
      })
    );
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.usuarioId.set(null);
    this.membresias.set([]);
    this.espacioActivo.set(null);
    [KEY_USUARIO, KEY_MEMBRESIAS, KEY_LEGACY_USER_ID, KEY_LEGACY_ROL].forEach(borrar);
    this.router.navigate(['/auth/login']);
  }

  membresiaPorSlug(slug: string | null | undefined): Membresia | null {
    return this.membresias().find((m) => m.espacio.slug === slug) ?? null;
  }

  activarEspacio(membresia: Membresia): void {
    if (this.espacioActivo()?.id !== membresia.espacio.id) {
      this.espacioActivo.set(membresia.espacio);
    }
    guardar(KEY_LEGACY_ROL, LEGACY_ROL[membresia.rol]);
  }

  // Refleja un cambio de nombre del espacio (sidebar, selector de espacios) sin volver a iniciar sesión
  renombrarEspacio(espacioId: number, nombre: string): void {
    const membresias = this.membresias().map((m) => (m.espacio.id === espacioId ? { ...m, espacio: { ...m.espacio, nombre } } : m));
    this.membresias.set(membresias);
    guardar(KEY_MEMBRESIAS, JSON.stringify(membresias));
    const activo = this.espacioActivo();
    if (activo?.id === espacioId) this.espacioActivo.set({ ...activo, nombre });
  }

  // Quita un espacio de la sesión (el usuario salió de él)
  quitarMembresia(espacioId: number): void {
    const slug = this.membresias().find((m) => m.espacio.id === espacioId)?.espacio.slug;
    if (slug && this.espacioPredeterminado() === slug) this.fijarPredeterminado(null);
    const membresias = this.membresias().filter((m) => m.espacio.id !== espacioId);
    this.membresias.set(membresias);
    guardar(KEY_MEMBRESIAS, JSON.stringify(membresias));
  }

  // Espacio que se abre directo al iniciar sesión (null: elegir cada vez)
  espacioPredeterminado(): string | null {
    const id = this.usuarioId();
    return id ? leerJson<Record<number, string>>(KEY_PREDETERMINADO)?.[id] ?? null : null;
  }

  fijarPredeterminado(slug: string | null): void {
    const id = this.usuarioId();
    if (!id) return;
    const mapa = leerJson<Record<number, string>>(KEY_PREDETERMINADO) ?? {};
    if (slug) mapa[id] = slug;
    else delete mapa[id];
    guardar(KEY_PREDETERMINADO, JSON.stringify(mapa));
  }

  // Inicio del rol dentro de un espacio: /colegio-san-jose/docente/inicio
  rutaInicio(membresia: Membresia): string {
    return `/${membresia.espacio.slug}/${membresia.rol}/inicio`;
  }

  // A dónde ir después del login: directo al espacio si hay uno solo
  rutaPostLogin(): string {
    // Si venía de un link (ej. una invitación a un curso), vuelve ahí
    const pendiente = leerVolverA();
    if (pendiente) return pendiente;
    const membresias = this.membresias();
    const predeterminada = this.membresiaPorSlug(this.espacioPredeterminado());
    if (predeterminada) return this.rutaInicio(predeterminada);
    return membresias.length === 1 ? this.rutaInicio(membresias[0]) : '/espacios';
  }

  // Ruta dentro del espacio activo: ruta('perfil') -> ['/', 'colegio-san-jose', 'perfil']
  ruta(...segmentos: (string | number)[]): (string | number)[] {
    return ['/', this.espacioActivo()?.slug ?? '', ...segmentos];
  }

  // Ruta dentro del área del rol activo: rutaRol('cursos', 5) -> ['/', slug, 'docente', 'cursos', 5]
  rutaRol(...segmentos: (string | number)[]): (string | number)[] {
    return this.ruta(this.rolActivo() ?? '', ...segmentos);
  }
}

const KEY_VOLVER_A = 'volverA';

// Página a la que volver después de iniciar sesión (se usa una sola vez)
export function recordarVolverA(ruta: string): void {
  try {
    sessionStorage.setItem(KEY_VOLVER_A, ruta);
  } catch {
    // Sin almacenamiento: después del login irá al inicio
  }
}

function leerVolverA(): string | null {
  try {
    const ruta = sessionStorage.getItem(KEY_VOLVER_A);
    sessionStorage.removeItem(KEY_VOLVER_A);
    return ruta;
  } catch {
    return null;
  }
}

function leerNumero(key: string): number | null {
  const valor = Number(leer(key));
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function leerJson<T>(key: string): T | null {
  try {
    return JSON.parse(leer(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

function leer(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function guardar(key: string, valor: string): void {
  try {
    localStorage.setItem(key, valor);
  } catch {
    // Sin almacenamiento: la sesión dura solo mientras la pestaña esté abierta
  }
}

function borrar(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nada que borrar
  }
}
