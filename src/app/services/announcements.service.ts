import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import type { CategoriaComunicado, Comunicado, Lectura, Publico } from '../core/models/announcements.model';

export interface ComunicadoRecibido {
  comunicado: Comunicado;
  lectura: Lectura | null;
}

export interface Alcance {
  destinatarios: number;
  leidos: number;
  confirmados: number;
}

export type BorradorComunicado = Pick<Comunicado, 'titulo' | 'mensaje' | 'categoria' | 'importante' | 'publico' | 'paraleloIds' | 'pideConfirmacion' | 'fechaEvento'>;

// Shapes of /api/espacios/:slug/comunicados
interface ApiComunicado {
  id: number;
  autorId: number | null;
  autorNombre: string;
  autorRol: 'direccion' | 'docente';
  titulo: string;
  mensaje: string;
  categoria: CategoriaComunicado;
  importante: boolean;
  publico: Publico[];
  paraleloIds: number[];
  pideConfirmacion: boolean;
  fechaEvento: string | null;
  enviado: string;
}
interface ApiLectura {
  leidoEl: string | null;
  confirmadoEl: string | null;
}
interface ApiPendiente {
  usuarioId: number;
  nombre: string;
  como: Publico;
}

const TIPO: Record<Publico, string> = { padres: 'Padre / tutor', estudiantes: 'Estudiante', docentes: 'Docente' };

// Announcements of the direction and the teachers, with their reach and read confirmations (API).
// `rol` says with which role the person writes or looks: someone can be in the direction and teach too.
@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  // ---------- Inbox ----------
  recibidos(): Observable<ComunicadoRecibido[]> {
    return this.http
      .get<{ comunicado: ApiComunicado; lectura: ApiLectura }[]>(`${this.base}/comunicados/recibidos`)
      .pipe(map((lista) => lista.map((x) => ({ comunicado: this.toComunicado(x.comunicado), lectura: this.toLectura(x.comunicado.id, x.lectura) }))));
  }

  marcarLeido(comunicadoId: number): Observable<Lectura> {
    return this.http
      .post<ApiLectura>(`${this.base}/comunicados/${comunicadoId}/leido`, {})
      .pipe(map((l) => this.toLectura(comunicadoId, l) ?? this.emptyRead(comunicadoId)));
  }

  // "Enterado": confirms an announcement that asks for it
  confirmar(comunicadoId: number): Observable<Lectura> {
    return this.http
      .post<ApiLectura>(`${this.base}/comunicados/${comunicadoId}/confirmar`, {})
      .pipe(map((l) => this.toLectura(comunicadoId, l) ?? this.emptyRead(comunicadoId)));
  }

  // ---------- Sent ----------
  // Direction: everything in the school. Teacher: their own.
  enviados(rol: 'direccion' | 'docente'): Observable<(Comunicado & { alcance: Alcance })[]> {
    return this.http
      .get<(ApiComunicado & { lecturas: Alcance })[]>(`${this.base}/comunicados/enviados`, { params: { rol } })
      .pipe(map((lista) => lista.map((c) => ({ ...this.toComunicado(c), alcance: c.lecturas }))));
  }

  // Who has not read it yet (or not confirmed, when confirmation was asked)
  pendientes(c: Comunicado): Observable<{ nombre: string; tipo: string }[]> {
    return this.http
      .get<ApiPendiente[]>(`${this.base}/comunicados/${c.id}/pendientes`)
      .pipe(map((lista) => lista.map((p) => ({ nombre: p.nombre, tipo: TIPO[p.como] })).sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre))));
  }

  // The API checks the rules (a teacher writes only to their own courses, never to teachers) and who receives it
  publicar(rol: 'direccion' | 'docente', borrador: BorradorComunicado): Observable<Comunicado & { alcance: Alcance }> {
    const cuerpo = {
      ...borrador,
      titulo: borrador.titulo.trim(),
      mensaje: borrador.mensaje.trim(),
      fechaEvento: borrador.fechaEvento || null,
    };
    return this.http
      .post<ApiComunicado & { lecturas: Alcance }>(`${this.base}/comunicados`, cuerpo, { params: { rol } })
      .pipe(map((c) => ({ ...this.toComunicado(c), alcance: c.lecturas })));
  }

  eliminar(c: Comunicado): Observable<void> {
    return this.http.delete<void>(`${this.base}/comunicados/${c.id}`);
  }

  // How many people a draft would reach (preview while writing)
  contar(rol: 'direccion' | 'docente', publico: Publico[], paraleloIds: number[]): Observable<number> {
    let params = new HttpParams().set('rol', rol).set('publico', publico.join(','));
    if (paraleloIds.length) params = params.set('paralelos', paraleloIds.join(','));
    return this.http.get<{ destinatarios: number }>(`${this.base}/comunicados/alcance`, { params }).pipe(map((r) => r.destinatarios));
  }

  // The signed-in person's teacher records in this school (their assignments point to these ids, not to the account)
  misFichasDocente(): Observable<number[]> {
    return this.http
      .get<{ fichas: { id: number; tipo: string }[] }>(`${this.base}/yo`)
      .pipe(map((yo) => yo.fichas.filter((f) => f.tipo === 'docente').map((f) => f.id)));
  }

  private toComunicado(c: ApiComunicado): Comunicado {
    return {
      ...c,
      espacioId: this.session.activeSpace()?.id ?? 0,
      autorId: c.autorId ?? 0,
      fechaEvento: c.fechaEvento ?? '',
    };
  }

  private toLectura(comunicadoId: number, l: ApiLectura | null): Lectura | null {
    if (!l?.leidoEl) return null;
    return { id: comunicadoId, comunicadoId, usuarioId: this.session.userId() ?? 0, leidoEl: l.leidoEl, confirmado: !!l.confirmadoEl };
  }

  private emptyRead(comunicadoId: number): Lectura {
    return { id: comunicadoId, comunicadoId, usuarioId: this.session.userId() ?? 0, leidoEl: new Date().toISOString(), confirmado: false };
  }
}
