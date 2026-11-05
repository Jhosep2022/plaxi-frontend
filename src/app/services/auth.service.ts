import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, from, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import type { Credentials, NewSchoolRequest, RegistrationData, RegistrationResult, SchoolRequest } from '../core/models/auth.model';
import { SLUG_PATTERN } from '../core/models/auth.model';
import { DEFAULT_GRADING_SCALE } from '../core/models/space.model';
import { todayIso } from '../core/utils/attendance';
import { isPasswordValid } from '../core/utils/password';
import { currentDateTimeIso } from '../core/utils/assignments';
import { MOCK_ADMIN, MOCK_CLAVES, MOCK_SOLICITUDES_COLEGIO, MOCK_TOKENS_RECUPERACION } from '../mocks/auth.mock';
import { MOCK_DELAY, MOCK_ESPACIOS, MOCK_MEMBRESIAS, MOCK_PERFILES } from '../mocks/mock-data';
import { MOCK_MIEMBRO_DESDE, MOCK_PERFIL_EXTRA, perfilExtraVacio } from '../mocks/profile.mock';
import { AcademyService } from './academy.service';
import { PATRON_CORREO, PATRON_USUARIO } from './account-profile.service';

// Slugs que no pueden usarse porque chocan con rutas de la app
const RESERVADOS = ['auth', 'admin', 'espacios', 'unirse', 'no-autorizado', 'perfil', 'api'];

// Autenticación y registro.
// MOCK: todo vive en memoria; cuando exista el backend, cada método es un endpoint de /auth
// (login, registro, disponibilidad, recuperar, restablecer, solicitudes-colegio).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private academia = inject(AcademyService);

  // POST /auth/login
  login({ usuario, clave }: Credentials): Observable<{ usuarioId: number }> {
    const dato = usuario.trim().toLowerCase();
    if (!dato || !clave) return throwError(() => new Error('Escribe tu usuario y tu contraseña.'));
    const perfil = MOCK_PERFILES.find((p) => p.username === dato || p.gmail === dato) ?? ([MOCK_ADMIN.username, MOCK_ADMIN.gmail].includes(dato) ? MOCK_ADMIN : undefined);
    if (!perfil) return this.fail('No encontramos una cuenta con ese usuario o correo.');
    if (!perfil.status) return this.fail('Esta cuenta fue dada de baja. Escríbenos si quieres recuperarla.');
    const guardada = MOCK_CLAVES[perfil.idUsuario];
    if (guardada !== undefined && guardada !== clave) return this.fail('La contraseña no es correcta.');
    return of({ usuarioId: perfil.idUsuario }).pipe(delay(MOCK_DELAY));
  }

  isPlatformAdmin(userId: number | null): boolean {
    return userId === MOCK_ADMIN.idUsuario;
  }

  logout(): void {
    // Con el backend: POST /auth/logout (invalida el token)
  }

  // GET /auth/disponible?usuario=… | correo=… | slug=…
  isUsernameAvailable(usuario: string): Observable<boolean> {
    const u = usuario.trim().toLowerCase();
    return of(u !== MOCK_ADMIN.username && !MOCK_PERFILES.some((p) => p.username === u)).pipe(delay(MOCK_DELAY / 2));
  }

  isEmailAvailable(correo: string): Observable<boolean> {
    const c = correo.trim().toLowerCase();
    return of(c !== MOCK_ADMIN.gmail && !MOCK_PERFILES.some((p) => p.gmail === c)).pipe(delay(MOCK_DELAY / 2));
  }

  isSlugAvailable(slug: string): Observable<boolean> {
    return of(!RESERVADOS.includes(slug) && !MOCK_ESPACIOS.some((e) => e.slug === slug)).pipe(delay(MOCK_DELAY / 2));
  }

  // POST /auth/registro: crea la cuenta y, según el tipo, la academia del docente o la inscripción del estudiante
  register(datos: RegistrationData): Observable<RegistrationResult> {
    const error = this.validateRegistration(datos);
    if (error) return throwError(() => new Error(error));
    return from(this.createAccount(datos));
  }

  // POST /academias: un usuario que ya tiene cuenta crea su academia (queda como su docente)
  createAcademy(usuarioId: number, nombre: string, slug: string): Observable<{ slug: string }> {
    if (!nombre.trim()) return throwError(() => new Error('Ponle un nombre a tu academia.'));
    if (!SLUG_PATTERN.test(slug) || slug.length < 3) return throwError(() => new Error('La dirección web solo puede tener letras minúsculas, números y guiones.'));
    if (RESERVADOS.includes(slug) || MOCK_ESPACIOS.some((e) => e.slug === slug)) return throwError(() => new Error('Ya existe una academia con esa dirección web. Prueba con otro nombre.'));
    const espacioId = Math.max(0, ...MOCK_ESPACIOS.map((e) => e.id)) + 1;
    MOCK_ESPACIOS.push({ id: espacioId, slug, nombre: nombre.trim(), tipo: 'academia', escala: DEFAULT_GRADING_SCALE });
    MOCK_MEMBRESIAS.push({ usuarioId, espacioId, rol: 'docente' });
    MOCK_MIEMBRO_DESDE[`${usuarioId}-${espacioId}`] = todayIso();
    return of({ slug }).pipe(delay(MOCK_DELAY));
  }

  // POST /auth/recuperar: siempre responde igual (no revela si el correo existe).
  // MOCK: devuelve el token para simular el enlace del correo.
  requestPasswordReset(correo: string): Observable<{ token: string | null }> {
    const c = correo.trim().toLowerCase();
    if (!PATRON_CORREO.test(c)) return throwError(() => new Error('Escribe un correo válido.'));
    const perfil = MOCK_PERFILES.find((p) => p.gmail === c && p.status);
    let token: string | null = null;
    if (perfil) {
      token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      MOCK_TOKENS_RECUPERACION[token] = perfil.idUsuario;
    }
    return of({ token }).pipe(delay(MOCK_DELAY));
  }

  // GET /auth/recuperar/:token
  isResetTokenValid(token: string): Observable<boolean> {
    return of(token in MOCK_TOKENS_RECUPERACION).pipe(delay(MOCK_DELAY / 2));
  }

  // POST /auth/restablecer
  resetPassword(token: string, clave: string): Observable<void> {
    const usuarioId = MOCK_TOKENS_RECUPERACION[token];
    if (!usuarioId) return throwError(() => new Error('El enlace ya no es válido. Pide uno nuevo.'));
    if (!isPasswordValid(clave)) return throwError(() => new Error('La contraseña debe tener al menos 8 caracteres, con letras y números.'));
    MOCK_CLAVES[usuarioId] = clave;
    delete MOCK_TOKENS_RECUPERACION[token];
    const extra = (MOCK_PERFIL_EXTRA[usuarioId] ??= perfilExtraVacio());
    extra.claveActualizada = todayIso();
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // POST /auth/solicitudes-colegio
  requestSchool(datos: NewSchoolRequest): Observable<SchoolRequest> {
    if (!datos.colegio.trim() || !datos.contacto.trim()) return throwError(() => new Error('Escribe el nombre del colegio y de la persona de contacto.'));
    if (!PATRON_CORREO.test(datos.correo.trim())) return throwError(() => new Error('Escribe un correo válido.'));
    const solicitud: SchoolRequest = {
      ...datos, colegio: datos.colegio.trim(), contacto: datos.contacto.trim(), correo: datos.correo.trim().toLowerCase(),
      id: Math.max(0, ...MOCK_SOLICITUDES_COLEGIO.map((s) => s.id)) + 1, fecha: currentDateTimeIso(), estado: 'nueva',
    };
    MOCK_SOLICITUDES_COLEGIO.push(solicitud);
    return of(structuredClone(solicitud)).pipe(delay(MOCK_DELAY));
  }

  // ---------- Interno ----------
  private validateRegistration(d: RegistrationData): string | null {
    if (!d.nombre.trim() || !d.primerApellido.trim()) return 'Escribe tu nombre y tu primer apellido.';
    if (!PATRON_CORREO.test(d.correo.trim())) return 'Escribe un correo válido.';
    if (MOCK_PERFILES.some((p) => p.gmail === d.correo.trim().toLowerCase())) return 'Ya existe una cuenta con ese correo.';
    if (!PATRON_USUARIO.test(d.usuario.trim().toLowerCase())) return 'El usuario debe tener de 3 a 20 caracteres: letras, números, punto o guion bajo.';
    if (MOCK_PERFILES.some((p) => p.username === d.usuario.trim().toLowerCase())) return 'Ese nombre de usuario ya está ocupado.';
    if (!isPasswordValid(d.clave)) return 'La contraseña debe tener al menos 8 caracteres, con letras y números.';
    if (d.tipo === 'docente') {
      const a = d.academia;
      if (!a?.nombre.trim()) return 'Ponle un nombre a tu academia.';
      if (!SLUG_PATTERN.test(a.slug) || a.slug.length < 3) return 'La dirección web solo puede tener letras minúsculas, números y guiones.';
      if (RESERVADOS.includes(a.slug) || MOCK_ESPACIOS.some((e) => e.slug === a.slug)) return 'Esa dirección web ya está en uso.';
    }
    return null;
  }

  private async createAccount(d: RegistrationData): Promise<RegistrationResult> {
    await new Promise((r) => setTimeout(r, MOCK_DELAY));
    const usuarioId = Math.max(0, ...MOCK_PERFILES.map((p) => p.idUsuario)) + 1;
    MOCK_PERFILES.push({
      idUsuario: usuarioId, username: d.usuario.trim().toLowerCase(), gmail: d.correo.trim().toLowerCase(), status: true,
      nombre: d.nombre.trim(), primerApellido: d.primerApellido.trim(), segundoApellido: d.segundoApellido.trim(), telefono: '', ci: '', id_rol: d.tipo === 'docente' ? '3' : '2',
    });
    MOCK_CLAVES[usuarioId] = d.clave;
    MOCK_PERFIL_EXTRA[usuarioId] = { ...perfilExtraVacio(), miembroDesde: todayIso(), ultimoAcceso: currentDateTimeIso(), claveActualizada: todayIso() };

    if (d.tipo === 'docente' && d.academia) {
      const espacioId = Math.max(0, ...MOCK_ESPACIOS.map((e) => e.id)) + 1;
      MOCK_ESPACIOS.push({ id: espacioId, slug: d.academia.slug, nombre: d.academia.nombre.trim(), tipo: 'academia', escala: DEFAULT_GRADING_SCALE });
      MOCK_MEMBRESIAS.push({ usuarioId, espacioId, rol: 'docente' });
      MOCK_MIEMBRO_DESDE[`${usuarioId}-${espacioId}`] = todayIso();
      let aulaId: number | null = null;
      const curso = d.academia.primerCurso;
      if (curso?.nombre.trim()) {
        const aula = await firstValueFrom(this.academia.createCourse(espacioId, usuarioId, {
          nombre: curso.nombre, descripcion: '', categoria: curso.categoria, nivel: 'Principiante', visibilidad: 'publico', aprobacionManual: false, portada: '',
        }));
        aulaId = aula.id;
      }
      return { usuarioId, espacioSlug: d.academia.slug, aulaId, inscripcion: null };
    }

    if (d.codigoCurso) {
      const curso = await firstValueFrom(this.academia.getCourseByCode(d.codigoCurso, usuarioId));
      if (curso) {
        const inscripcion = await firstValueFrom(this.academia.enroll(curso.aula.id, usuarioId));
        MOCK_MIEMBRO_DESDE[`${usuarioId}-${curso.espacio.id}`] = todayIso();
        return { usuarioId, espacioSlug: curso.espacio.slug, aulaId: curso.aula.id, inscripcion };
      }
    }
    return { usuarioId, espacioSlug: null, aulaId: null, inscripcion: null };
  }

  private fail(mensaje: string): Observable<never> {
    return new Observable<never>((s) => {
      const t = setTimeout(() => s.error(new Error(mensaje)), MOCK_DELAY);
      return () => clearTimeout(t);
    });
  }
}
