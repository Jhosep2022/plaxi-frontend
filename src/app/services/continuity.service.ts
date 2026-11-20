import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';

export type ContinuityResult = 'promovido' | 'repite' | 'egresado' | 'sin_resultado';
export type ContinuityDecision = 'promovido' | 'repite' | 'egresado' | 'no_continua';

export interface ContinuityStudent {
  estudianteId: number;
  nombre: string;
  paraleloOrigenId: number;
  paraleloOrigen: string;
  resultado: ContinuityResult;
  reprobadas: number;
  promedio: number | null;
  paraleloDestinoId: number | null;
  yaDecidido: ContinuityDecision | 'inscrito' | null;
}

export interface ContinuityPreview {
  origen: { id: number; anio: number; periodosCerrados: boolean };
  destino: { id: number; anio: number };
  notaAprobacion: number;
  paralelosDestino: { id: number; nombre: string; nivel: string; grado: number; capacidad: number; inscritos: number }[];
  estudiantes: ContinuityStudent[];
}

export interface ContinuityConfirmation {
  inscritos: number;
  egresados: number;
  noContinuan: number;
  yaRegistrados: number;
}

export interface SchoolYear {
  id: number;
  anio: number;
  estado: 'planificada' | 'activa' | 'cerrada';
}

// Preparing the next school year from the previous one (direction): preview and confirm in a batch
@Injectable({ providedIn: 'root' })
export class ContinuityService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);

  private get base(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }

  years(): Observable<SchoolYear[]> {
    return this.http.get<SchoolYear[]>(`${this.base}/gestiones`);
  }

  preview(destinoId: number): Observable<ContinuityPreview> {
    return this.http.get<ContinuityPreview>(`${this.base}/continuidad/${destinoId}`);
  }

  confirm(destinoId: number, decisiones: { estudianteId: number; decision: ContinuityDecision; paraleloDestinoId?: number | null }[]): Observable<ContinuityConfirmation> {
    return this.http.post<ContinuityConfirmation>(`${this.base}/continuidad/${destinoId}`, { decisiones });
  }
}
