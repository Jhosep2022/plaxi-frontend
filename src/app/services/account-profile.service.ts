import { Injectable, inject, signal } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import type { EmergencyContact, ProfileDevice, ProfileLinks, UserProfile, NotificationPreferences } from '../core/models/profile.model';
import { PHOTO_MAX_KB } from '../core/models/profile.model';
import { SessionService } from '../core/auth/session.service';
import { environment } from '../../environments/environment';

interface ApiProfile {
  id: number; usuario: string; correo: string; nombre: string; primerApellido: string;
  segundoApellido: string | null; telefono: string | null; ci: string | null;
  imagenUrl: string | null; avatar: string; canUploadPhoto: boolean; fechaNacimiento: string | null; direccion: string | null;
  especialidad: string | null; bio: string | null; enlaces: Partial<ProfileLinks> | null;
  contactoEmergencia: Partial<EmergencyContact> | null;
  notificaciones: NotificationPreferences | null; esAdmin: boolean;
  miembroDesde: string; ultimoAcceso: string | null; claveActualizada: string | null;
}

export interface DatosPersonales {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  ci: string;
  fechaNacimiento: string;
}

// The email is not here: it changes with the password and a confirmation link (requestEmailChange)
export interface DatosContacto {
  telefono: string;
  direccion: string;
}

export interface DatosDocente {
  especialidad: string;
  bio: string;
  enlaces: ProfileLinks;
}

export const PATRON_USUARIO = /^[a-z0-9._]{3,20}$/;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PATRON_CELULAR = /^[67]\d{7}$/;
export const PATRON_ENLACE = /^https?:\/\/\S+\.\S+/;

// Profile of the signed-in user: personal data, photo, security and preferences, all through /api/perfil.
// The side menu uses it, so it does not load classrooms, grades or attendance: the header indicators and
// "Mis espacios" live in ProfileActivityService.
@Injectable({ providedIn: 'root' })
export class AccountProfileService {
  private http = inject(HttpClient);
  // Uploads go straight to storage with a signed URL, without the API token
  private storageHttp = new HttpClient(inject(HttpBackend));
  private currentSession = inject(SessionService);
  private readonly url = `${environment.API_URL}/perfil`;

  // Goes up every time the name or the photo change (the sidebar reloads)
  readonly version = signal(0);

  // Only the signed-in account: other people's data is shown by each module (students, teachers, children)
  myProfile(): Observable<UserProfile> {
    return this.http.get<ApiProfile>(this.url).pipe(map((profile) => this.toUserProfile(profile)));
  }

  // Saves the chosen gallery avatar; null goes back to the automatic one (HU-AV-02)
  changeAvatar(avatar: string | null): Observable<UserProfile> {
    return this.send(this.http.put<ApiProfile>(`${this.url}/avatar`, { avatar }), true);
  }

  // ---------- Personal data ----------
  savePersonalDetails(datos: DatosPersonales): Observable<UserProfile> {
    return this.send(this.http.patch<ApiProfile>(`${this.url}/personales`, datos), true);
  }

  saveContactDetails(datos: DatosContacto): Observable<UserProfile> {
    return this.send(this.http.patch<ApiProfile>(`${this.url}/contacto`, { telefono: datos.telefono.trim(), direccion: datos.direccion.trim() }));
  }

  // The new email only replaces the current one after its owner opens the link we send to it
  requestEmailChange(correo: string, clave: string): Observable<string> {
    return this.http
      .post<{ correoPendiente: string }>(`${this.url}/correo`, { correo: correo.trim(), clave })
      .pipe(map((respuesta) => respuesta.correoPendiente));
  }

  // Public: the link may be opened on a device without a session
  confirmEmailChange(token: string): Observable<string> {
    return this.http
      .post<{ correo: string }>(`${environment.API_URL}/auth/confirmar-correo`, { token })
      .pipe(map((respuesta) => respuesta.correo));
  }

  saveUsername(username: string): Observable<UserProfile> {
    return this.send(this.http.patch<ApiProfile>(`${this.url}/usuario`, { usuario: username.trim().toLowerCase() }), true);
  }

  saveTeacherProfile(datos: DatosDocente): Observable<UserProfile> {
    return this.send(this.http.patch<ApiProfile>(`${this.url}/docente`, datos));
  }

  saveEmergencyContact(contacto: EmergencyContact): Observable<UserProfile> {
    return this.send(this.http.patch<ApiProfile>(`${this.url}/emergencia`, contacto));
  }

  // Asks for a signed upload, sends the image to storage, confirms it and uses it. null removes the photo.
  changePhoto(archivo: File | null): Observable<UserProfile> {
    if (!archivo) return this.send(this.http.put<ApiProfile>(`${this.url}/foto`, { archivoId: null }), true);
    if (archivo.size > PHOTO_MAX_KB * 1024) return throwError(() => new Error(`La foto debe pesar menos de ${PHOTO_MAX_KB} KB.`));
    const subida$ = this.http
      .post<{ id: number; urlSubida: string }>(`${this.url}/archivos/subida`, { nombre: archivo.name, tipoMime: archivo.type, bytes: archivo.size })
      .pipe(
        switchMap((subida) =>
          this.storageHttp.put(subida.urlSubida, archivo, { headers: { 'Content-Type': archivo.type }, responseType: 'text' }).pipe(
            switchMap(() => this.http.post(`${this.url}/archivos/${subida.id}/confirmar`, {})),
            switchMap(() => this.http.put<ApiProfile>(`${this.url}/foto`, { archivoId: subida.id })),
          ),
        ),
      );
    return this.send(subida$, true);
  }

  // ---------- Security ----------
  changePassword(actual: string, nueva: string): Observable<UserProfile> {
    return this.send(this.http.put<ApiProfile>(`${this.url}/clave`, { actual, nueva }));
  }

  devices(): Observable<ProfileDevice[]> {
    return this.http.get<ProfileDevice[]>(`${this.url}/dispositivos`);
  }

  signOutDevice(dispositivoId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/dispositivos/${encodeURIComponent(dispositivoId)}`);
  }

  signOutOtherDevices(): Observable<void> {
    return this.http.delete<void>(`${this.url}/dispositivos`);
  }

  // Logical close: the account becomes inactive and every session ends. Asks for the username and the password.
  darDeBaja(confirmacion: string, clave: string): Observable<void> {
    return this.http.delete<void>(this.url, { body: { confirmacion: confirmacion.trim(), clave } });
  }

  // ---------- Preferences ----------
  saveNotificationPreferences(notificaciones: NotificationPreferences): Observable<UserProfile> {
    return this.send(this.http.put<ApiProfile>(`${this.url}/notificaciones`, notificaciones));
  }

  // ---------- Internal ----------
  private send(peticion: Observable<ApiProfile>, refrescarMenu = false): Observable<UserProfile> {
    return peticion.pipe(
      map((profile) => this.toUserProfile(profile)),
      tap(() => refrescarMenu && this.version.update((v) => v + 1)),
    );
  }

  private toUserProfile(profile: ApiProfile): UserProfile {
    return {
      idUsuario: profile.id, username: profile.usuario, gmail: profile.correo,
      status: true, nombre: profile.nombre, primerApellido: profile.primerApellido,
      segundoApellido: profile.segundoApellido ?? '', telefono: profile.telefono ?? '',
      ci: profile.ci ?? '', imagenUrl: profile.imagenUrl ?? undefined,
      avatar: profile.avatar, canUploadPhoto: profile.canUploadPhoto,
      id_rol: String(this.currentSession.activeRole() ?? ''), isAdmin: profile.esAdmin,
      pending: false, fechaNacimiento: profile.fechaNacimiento ?? '',
      direccion: profile.direccion ?? '', especialidad: profile.especialidad ?? '',
      bio: profile.bio ?? '', enlaces: { ...NO_LINKS, ...profile.enlaces },
      contactoEmergencia: { ...NO_EMERGENCY_CONTACT, ...profile.contactoEmergencia },
      miembroDesde: profile.miembroDesde, ultimoAcceso: profile.ultimoAcceso ?? '',
      claveActualizada: profile.claveActualizada?.slice(0, 10) ?? '',
      notificaciones: profile.notificaciones ?? DEFAULT_NOTIFICATIONS,
    } satisfies UserProfile;
  }
}

const NO_LINKS: ProfileLinks = { sitio: '', linkedin: '', instagram: '', youtube: '' };
const NO_EMERGENCY_CONTACT: EmergencyContact = { nombre: '', parentesco: '', telefono: '' };
// What the app shows before the person saves their own preferences
const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  comunicados: { correo: false, app: true },
  tareas: { correo: false, app: true },
  calificaciones: { correo: false, app: true },
  asistencia: { correo: false, app: true },
  sesiones: { correo: false, app: true },
  resumen: { correo: false, app: false },
};
