import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/auth/session.service';
import type { Institution, InstitutionSummary } from '../core/models/institution.model';

export const LOGO_MAX_KB = 500;

@Injectable({ providedIn: 'root' })
export class InstitutionService {
  private readonly http = inject(HttpClient);
  private readonly storageHttp = new HttpClient(inject(HttpBackend));
  private readonly session = inject(SessionService);

  getDetails(spaceId: number): Observable<Institution> {
    return this.http.get<Partial<Institution>>(this.urlFor(spaceId)).pipe(map((response) => {
      const defaults: Institution = {
      id: spaceId, nombre: '', sigla: '', lema: '', codigoSie: '', dependencia: 'particular', niveles: [],
      departamento: 'La Paz', municipio: '', zona: '', direccion: '',
      telefono: '', email: '', sitioWeb: '', director: '', subdirector: '', logo: '',
      // A new school may not have an institution row yet.
      fundacion: new Date().getFullYear(),
      };
      return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, response[key as keyof Institution] ?? value])) as unknown as Institution;
    }));
  }

  getSummary(spaceId: number): Observable<InstitutionSummary> {
    return this.http.get<InstitutionSummary>(`${this.urlFor(spaceId)}/resumen`);
  }

  save(institution: Institution, logoFile?: File | null): Observable<Institution> {
    const { id, logo: _logo, ...fields } = institution;
    return this.http.put(this.urlFor(id), { ...fields, nombre: fields.nombre.trim() }).pipe(
      switchMap(() => logoFile === undefined ? this.getDetails(id) : this.saveLogo(id, logoFile)),
    );
  }

  private saveLogo(spaceId: number, file: File | null): Observable<Institution> {
    const url = this.urlFor(spaceId);
    if (!file) return this.http.put(`${url}/logo`, { archivoId: null }).pipe(switchMap(() => this.getDetails(spaceId)));
    if (file.size > LOGO_MAX_KB * 1024) return throwError(() => new Error(`El logo debe pesar menos de ${LOGO_MAX_KB} KB.`));
    const filesUrl = url.replace(/\/institucion$/, '/archivos');
    return this.http.post<{ id: number; urlSubida: string }>(`${filesUrl}/subida`, {
      uso: 'logo', nombre: file.name, tipoMime: file.type, bytes: file.size,
    }).pipe(
      switchMap((upload) => this.storageHttp.put(upload.urlSubida, file, { headers: { 'Content-Type': file.type }, responseType: 'text' }).pipe(
        switchMap(() => this.http.post(`${filesUrl}/${upload.id}/confirmar`, {})),
        switchMap(() => this.http.put(`${url}/logo`, { archivoId: upload.id })),
      )),
      switchMap(() => this.getDetails(spaceId)),
    );
  }

  private urlFor(spaceId: number): string {
    const active = this.session.activeSpace();
    const space = active?.id === spaceId ? active : this.session.memberships().find((membership) => membership.espacio.id === spaceId)?.espacio;
    if (!space) throw new Error('Selecciona el colegio antes de consultar sus datos.');
    return `${environment.API_URL}/espacios/${encodeURIComponent(space.slug)}/institucion`;
  }
}
