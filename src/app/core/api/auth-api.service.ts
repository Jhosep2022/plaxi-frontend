import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { RegistrationData } from '../models/auth.model';

export interface ApiMembership {
  espacio: { id: number; slug: string; nombre: string; tipo: 'colegio' | 'academia'; estado: string };
  rol: 'direccion' | 'secretaria' | 'docente' | 'estudiante' | 'padre';
  desde: string;
  puedeSalir: boolean;
  motivo: string;
}

export interface ApiSessionResponse {
  accessToken: string;
  expiraEn: number;
  usuario: { id: number; usuario: string; nombre: string; primerApellido: string; imagenUrl: string | null; esAdmin: boolean; passwordChangeRequired: boolean };
  membresias: ApiMembership[];
}

export interface ActivationStatus {
  valido: boolean;
  usuario?: string;
  nombre?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/auth`;

  login(credentials: { username: string; password: string }): Observable<ApiSessionResponse> {
    return this.http.post<ApiSessionResponse>(`${this.url}/login`, { usuario: credentials.username, clave: credentials.password }, { withCredentials: true });
  }

  register(details: RegistrationData): Observable<ApiSessionResponse> {
    return this.http.post<ApiSessionResponse>(`${this.url}/registro`, details, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.url}/logout`, {}, { withCredentials: true });
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post(`${this.url}/recuperar`, { correo: email }).pipe(map(() => undefined));
  }

  isResetTokenValid(token: string): Observable<boolean> {
    return this.http.get<{ valido: boolean }>(`${this.url}/recuperar/${encodeURIComponent(token)}`).pipe(map((response) => response.valido));
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.url}/restablecer`, { token, clave: password });
  }

  getActivationStatus(token: string): Observable<ActivationStatus> {
    return this.http.get<ActivationStatus>(`${this.url}/activar/${encodeURIComponent(token)}`);
  }

  activateWithInvitation(token: string, password: string): Observable<ApiSessionResponse> {
    return this.http.post<ApiSessionResponse>(`${this.url}/activar`, { token, clave: password }, { withCredentials: true });
  }

  isAvailable(field: 'usuario' | 'correo' | 'slug', value: string): Observable<boolean> {
    const params = new HttpParams().set(field, value);
    return this.http.get<{ disponible: boolean }>(`${this.url}/disponible`, { params }).pipe(map((response) => response.disponible));
  }

  requestSchool(request: object): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.url}/solicitudes-colegio`, request);
  }

  getInvitedCourse(code: string): Observable<{ docente: string; aula: { nombre: string } }> {
    return this.http.get<{ docente: string; nombre: string }>(`${environment.API_URL}/cursos/codigo/${encodeURIComponent(code)}`).pipe(
      map((course) => ({ docente: course.docente, aula: { nombre: course.nombre } })),
    );
  }

  changeTemporaryPassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put(`${environment.API_URL}/perfil/clave`, { actual: currentPassword, nueva: newPassword }).pipe(map(() => undefined));
  }
}
