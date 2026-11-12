import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { AdminRequestStatus } from './admin.service';

export interface SchoolRequest {
  id: number;
  school: string;
  city: string;
  contact: string;
  role: string;
  email: string;
  phone: string;
  students: number;
  message: string;
  adminNotes: string;
  status: AdminRequestStatus;
  createdAt: string;
}

export interface CreateSchoolResult {
  spaceId: number;
  directorId: number;
  invitationSent: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminRequestsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/admin/requests`;

  list(page: number, status: AdminRequestStatus | '') {
    let params = new HttpParams().set('page', page);
    if (status) params = params.set('status', status);
    return this.http.get<SchoolRequest[]>(this.url, { params });
  }

  review(id: number, status: 'contacted' | 'discarded', notes: string) {
    return this.http.put<SchoolRequest>(`${this.url}/${id}`, { status, notes });
  }

  createSchool(id: number, input: {
    name: string; slug: string; directorFirstName: string; directorLastName: string;
    directorEmail: string; academicYear: number; seats: number; amountBs: string;
    paidAt: string; periodFrom: string; periodTo: string; paymentReference: string;
  }) {
    return this.http.post<CreateSchoolResult>(`${this.url}/${id}/school`, input);
  }
}
