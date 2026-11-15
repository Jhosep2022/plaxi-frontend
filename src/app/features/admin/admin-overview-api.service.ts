import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toPlatformSpace, type SpaceResponse } from './admin-spaces-api.service';

export interface AdminSummary {
  spaces: { type: 'school' | 'academy'; status: string; count: number }[];
  newRequests: number;
  paymentsDueSoon: number;
  activeUsers: number;
  storageBytes: number;
}

export function countSpaces(summary: AdminSummary, type?: 'school' | 'academy', status?: string): number {
  return summary.spaces.filter((group) => (!type || group.type === type) && (!status || group.status === status))
    .reduce((total, group) => total + group.count, 0);
}

@Injectable({ providedIn: 'root' })
export class AdminOverviewApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/admin`;

  getSummary() {
    return this.http.get<AdminSummary>(`${this.url}/summary`);
  }

  getOverview() {
    return forkJoin({
      summary: this.getSummary(),
      spaces: this.http.get<SpaceResponse[]>(`${this.url}/spaces`, { params: new HttpParams().set('page', 1) }),
    }).pipe(map(({ summary, spaces }) => ({ summary, spaces: spaces.map(toPlatformSpace) })));
  }
}
