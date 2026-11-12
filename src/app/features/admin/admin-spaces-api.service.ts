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

@Injectable({ providedIn: 'root' })
export class AdminSpacesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/admin/spaces`;

  list(type: 'school' | 'academy', page: number) {
    return this.http.get<SpaceResponse[]>(this.url, { params: new HttpParams().set('type', type).set('page', page) });
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
}

export function toPlatformSpace(row: SpaceResponse): PlatformSpace {
  return { ...row, memberCount: Object.values(row.memberCounts).reduce((total, count) => total + count, 0) };
}
