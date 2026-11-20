import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AdminAuditEntry, AdminUser, AdminUserCounts } from './admin.service';

export type AdminUserFilter = 'all' | 'active' | 'pending' | 'inactive';

// Cuentas de la plataforma y registro de acciones del panel (solo el equipo de plataforma)
@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/admin`;

  list(search: string, filter: AdminUserFilter, page: number): Observable<AdminUser[]> {
    let params = new HttpParams().set('page', page);
    if (search.trim()) params = params.set('search', search.trim());
    if (filter !== 'all') params = params.set('status', filter);
    return this.http.get<AdminUser[]>(`${this.url}/users`, { params });
  }

  counts(search: string): Observable<AdminUserCounts> {
    return this.http.get<AdminUserCounts>(`${this.url}/users/counts`, { params: search.trim() ? { search: search.trim() } : {} });
  }

  get(id: number): Observable<AdminUser> {
    return this.http.get<AdminUser>(`${this.url}/users/${id}`);
  }

  changeActive(id: number, active: boolean, reason: string): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.url}/users/${id}/active`, { active, reason: reason.trim() });
  }

  sendInvitation(id: number): Observable<{ sent: boolean }> {
    return this.http.post<{ sent: boolean }>(`${this.url}/users/${id}/invitation`, {});
  }

  audit(page: number): Observable<AdminAuditEntry[]> {
    return this.http.get<AdminAuditEntry[]>(`${this.url}/audit`, { params: { page } });
  }
}
