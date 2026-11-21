import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SessionService } from '../auth/session.service';
import { environment } from '../../../environments/environment';
import type { Gestion, Paralelo } from '../models/academics.model';
import type { Parentesco } from '../models/people.model';

export interface MemberPerson {
  id: number;
  tipo: string;
  nombre: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  ci: string;
  fechaNacimiento: string | null;
  avatar?: string | null;
}
export interface SchoolMember {
  gestion: Gestion | null;
  fichas: MemberPerson[];
  paralelo:
    | (Omit<Paralelo, 'aulaId' | 'estudiantes'> & {
        aulaId: number | null;
        etiqueta: string;
      })
    | null;
  hijos: (MemberPerson & {
    parentesco: Parentesco;
    paralelo: SchoolMember['paralelo'];
  })[];
}

@Injectable({ providedIn: 'root' })
export class SchoolApiService {
  readonly http = inject(HttpClient);
  readonly session = inject(SessionService);
  url(path: string, spaceId?: number): string {
    const space = this.session.activeSpace();
    if (!space || (spaceId !== undefined && space.id !== spaceId))
      throw new Error('Selecciona el colegio antes de consultar sus datos.');
    return `${environment.API_URL}/espacios/${encodeURIComponent(space.slug)}/${path}`;
  }
  member() {
    return this.http.get<SchoolMember>(this.url('yo'));
  }
}
