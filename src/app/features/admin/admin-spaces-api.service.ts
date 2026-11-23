import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { AdminSpace, AdminSpacePlan, AdminSpaceStatus } from './admin.service';

export interface PlatformSpace extends AdminSpace {
  paidUntil: string | null;
}

export interface SpaceResponse extends Omit<PlatformSpace, 'memberCount'> {
  memberCounts: { directors: number; teachers: number; students: number; parents: number };
}

// Cupos de un colegio en su gestión activa: solo conteos, nunca nombres
export interface SeatSummary {
  year: number;
  contracted: number | null;
  used: number;
  active: number;
  withdrawnFree: number;
  withdrawnBilled: number;
  last30Days: { enrolled: number; withdrawn: number };
}
export interface SpaceDetails extends SpaceResponse {
  storage: { usedBytes: number; limitBytes: number };
  seats: SeatSummary | null;
  dataDeletedAt: string | null; // when Alclick deleted the school's data
}

// What Alclick gives the school after deleting its data at the end of the contract
export interface DeletionCertificate {
  espacio: { id: number; nombre: string; slug: string };
  borradoEl: string;
  motivo: string;
  filas: Record<string, number>;
  cuentasEliminadas: number;
  archivos: { borrados: number; pendientes: string[] };
  conservado: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminSpacesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/admin/spaces`;

  list(type: 'school' | 'academy', page: number) {
    return this.http.get<SpaceResponse[]>(this.url, { params: new HttpParams().set('type', type).set('page', page) });
  }

  get(id: number) {
    return this.http.get<SpaceDetails>(`${this.url}/${id}`);
  }

  changeStatus(id: number, status: AdminSpaceStatus, reason: string) {
    return this.http.put(`${this.url}/${id}/status`, { status, reason });
  }

  // Academies only: free plan (10 students, 1 GB) or paid plan (10 GB, no student limit)
  changePlan(id: number, plan: AdminSpacePlan, reason: string) {
    return this.http.put(`${this.url}/${id}/plan`, { plan, reason });
  }

  changeLimits(id: number, limits: PlatformSpace['limits'], reason: string) {
    return this.http.put(`${this.url}/${id}/limits`, { ...limits, reason });
  }

  // Irreversible: deletes the school's data (it must be read-only or suspended) and returns the certificate
  deleteData(id: number, confirmacion: string, motivo: string) {
    return this.http.delete<DeletionCertificate>(`${this.url}/${id}/datos`, { body: { confirmacion, motivo } });
  }
}

export function toPlatformSpace(row: SpaceResponse): PlatformSpace {
  return { ...row, memberCount: Object.values(row.memberCounts).reduce((total, count) => total + count, 0) };
}
