import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Aviso de la campana: notas, asistencia, tareas, comunicados… (solo dentro de la app)
export interface Aviso {
  id: number;
  espacioId: number | null;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace: string;
  leida: boolean;
  creada: string;
}

export interface Avisos {
  noLeidas: number;
  avisos: Aviso[];
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/notificaciones`;

  list(): Observable<Avisos> {
    return this.http.get<Avisos>(this.url);
  }

  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/leida`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.url}/leidas`, {});
  }
}
