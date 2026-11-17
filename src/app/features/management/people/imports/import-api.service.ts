import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SessionService } from '../../../../core/auth/session.service';
import { environment } from '../../../../../environments/environment';

export interface ImportWorkbook {
  yearId: number;
  students: Record<string, unknown>[];
  teachers: Record<string, unknown>[];
  parents: Record<string, unknown>[];
}
export interface ImportPreviewRow {
  kind: 'student' | 'teacher' | 'parent';
  row: number;
  fromStudentRow?: boolean; // a tutor written in the student's row
  person: { nombres: string; primerApellido: string; ci: string };
  action: 'create' | 'existing';
  errors: string[]; // left out until fixed
  warnings: string[]; // saved without the wrong optional data
}
export interface ImportPreview {
  valid: boolean; // there is something to save
  version: string;
  globalErrors: string[];
  rows: ImportPreviewRow[];
  summary: { rows: number; ready: number; withErrors: number; withWarnings: number; newPeople: number; existingPeople: number };
}
export interface ImportJob {
  id: string;
  status: 'queued' | 'completed' | 'failed';
  error: string | null;
  accessAvailable: boolean;
  createdAt?: string;
  result: {
    created: number;
    existing: number;
    links: number;
    skipped: number;
    accessCount: number;
  } | null;
}
export interface ImportClassGroup {
  nivel: string;
  grado: number;
  letra: string;
  turno: string;
  capacidad: number;
  estudiantes: number;
}
@Injectable({ providedIn: 'root' })
export class PeopleImportApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private get base() {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }
  years() {
    return this.http.get<{ id: number; anio: number; estado: string }[]>(`${this.base}/gestiones`);
  }
  groups(yearId: number) {
    return this.http.get<ImportClassGroup[]>(`${this.base}/paralelos`, {
      params: new HttpParams().set('gestion', yearId),
    });
  }
  preview(input: ImportWorkbook) {
    return this.http.post<ImportPreview>(`${this.base}/people-imports/preview`, input);
  }
  confirm(input: ImportWorkbook, version: string, requestId: string) {
    return this.http.post<ImportJob>(`${this.base}/people-imports`, {
      ...input,
      version,
      requestId,
    });
  }
  job(id: string) {
    return this.http.get<ImportJob>(`${this.base}/people-imports/${id}`);
  }
  access(id: string) {
    return this.http.post<{ name: string; username: string; temporaryPassword: string }[]>(
      `${this.base}/people-imports/${id}/access`,
      {},
    );
  }
}
