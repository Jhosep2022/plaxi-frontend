import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, switchMap, throwError } from 'rxjs';
import { SessionService } from '../core/auth/session.service';
import { Docente, Gestion, Paralelo } from '../core/models/academics.model';
import { Estudiante } from '../core/models/attendance.model';
import { Parentesco, Tutor, Vinculo } from '../core/models/people.model';
import { environment } from '../../environments/environment';

export interface AccessCard {
  personaId: number;
  rol: 'estudiante' | 'padre';
  nombre: string;
  usuario: string;
  estado: 'pendiente' | 'activa' | 'sin_cuenta' | 'sin_carnet';
  enlace?: string;
  hijos?: { nombre: string; paralelo: string }[];
}

export interface AccessCardSheet {
  paralelo: string;
  venceEl: string;
  tarjetas: AccessCard[];
}

export interface CargaDocente {
  materias: string[];
  clasesSemana: number;
}
export interface HijoDeTutor {
  estudianteId: number;
  parentesco: Parentesco;
}
export interface PersonNameFields {
  givenNames?: string;
  firstSurname?: string;
  secondSurname?: string;
}
interface ApiPerson {
  avatar?: string | null;
  id: number;
  nombre: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  ci: string;
  correo: string;
  telefono: string;
  activa: boolean;
  usuario: string | null;
  cuentaActivada: boolean;
  especialidad?: string;
  ocupacion?: string;
  fechaNacimiento?: string | null;
  paraleloId?: number | null;
  hijos?: HijoDeTutor[];
  carga?: CargaDocente;
  temporaryPassword?: string;
}
export const personNameFields = (person: PersonNameFields) => ({
  givenNames: person.givenNames ?? '',
  firstSurname: person.firstSurname ?? '',
  secondSurname: person.secondSurname ?? '',
});
export const personFullName = (person: PersonNameFields) =>
  [person.givenNames, person.firstSurname, person.secondSurname]
    .filter(Boolean)
    .join(' ')
    .trim();
const namesOf = (person: ApiPerson) => ({
  givenNames: person.nombres,
  firstSurname: person.primerApellido,
  secondSurname: person.segundoApellido,
});
const toTeacher = (person: ApiPerson): Docente => ({
  avatar: person.avatar ?? null,
  id: person.id,
  nombre: person.nombre,
  ...namesOf(person),
  ci: person.ci,
  telefono: person.telefono,
  email: person.correo,
  especialidad: person.especialidad ?? '',
  activo: person.activa,
});
const toStudent = (person: ApiPerson): Estudiante => ({
  avatar: person.avatar ?? null,
  id: person.id,
  nombre: person.nombre,
  ...namesOf(person),
  ci: person.ci,
  fechaNacimiento: person.fechaNacimiento ?? '',
  paraleloId: person.paraleloId ?? 0,
});
const toParent = (person: ApiPerson): Tutor => ({
  avatar: person.avatar ?? null,
  id: person.id,
  nombre: person.nombre,
  ...namesOf(person),
  ci: person.ci,
  telefono: person.telefono,
  email: person.correo,
  ocupacion: person.ocupacion ?? '',
});

@Injectable({ providedIn: 'root' })
export class PeopleService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private get base() {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}`;
  }
  docentes(): Observable<Docente[]> {
    return this.http
      .get<ApiPerson[]>(`${this.base}/docentes`)
      .pipe(map((rows) => rows.map(toTeacher)));
  }
  cargaDocentes(): Observable<Map<number, CargaDocente>> {
    return this.http
      .get<ApiPerson[]>(`${this.base}/docentes`)
      .pipe(
        map(
          (rows) =>
            new Map(
              rows.map((row) => [
                row.id,
                row.carga ?? { materias: [], clasesSemana: 0 },
              ]),
            ),
        ),
      );
  }
  estudiantes(): Observable<Estudiante[]> {
    return this.http
      .get<ApiPerson[]>(`${this.base}/estudiantes`)
      .pipe(map((rows) => rows.map(toStudent)));
  }
  padres(): Observable<Tutor[]> {
    return this.http
      .get<ApiPerson[]>(`${this.base}/padres`)
      .pipe(map((rows) => rows.map(toParent)));
  }
  vinculos(): Observable<Vinculo[]> {
    return this.http
      .get<ApiPerson[]>(`${this.base}/padres`)
      .pipe(
        map((rows) =>
          rows.flatMap((row) =>
            (row.hijos ?? []).map((child, index) => ({
              id: row.id * 100 + index,
              padreId: row.id,
              ...child,
            })),
          ),
        ),
      );
  }
  cuentas(_spaceId: number): Observable<Set<number>> {
    return forkJoin([
      this.http.get<ApiPerson[]>(`${this.base}/estudiantes`),
      this.http.get<ApiPerson[]>(`${this.base}/docentes`),
      this.http.get<ApiPerson[]>(`${this.base}/padres`),
    ]).pipe(
      map(
        (groups) =>
          new Set(
            groups
              .flat()
              .filter((row) => row.cuentaActivada)
              .map((row) => row.id),
          ),
      ),
    );
  }
  activeYear(): Observable<Gestion | undefined> {
    return this.http
      .get<Gestion[]>(`${this.base}/gestiones`)
      .pipe(map((rows) => rows.find((row) => row.estado === 'activa')));
  }
  // Access cards with QR of a class group (direction). The QR links come only in this answer.
  accessCards(paraleloId: number): Observable<AccessCardSheet> {
    return this.http.post<AccessCardSheet>(`${this.base}/tarjetas-acceso`, { paraleloId });
  }
  classGroups(): Observable<Paralelo[]> {
    return this.http
      .get<(Omit<Paralelo, 'aulaId'> & { aulaId: number | null })[]>(
        `${this.base}/paralelos`,
      )
      .pipe(
        map((rows) => rows.map((row) => ({ ...row, aulaId: row.aulaId ?? 0 }))),
      );
  }
  guardarDocente(
    person: Omit<Docente, 'id'> & { id?: number },
  ): Observable<Docente> {
    return this.save('docentes', person.id, {
      ...this.fields(person),
      especialidad: person.especialidad,
      activa: person.activo,
    }).pipe(map(toTeacher));
  }
  guardarEstudiante(
    person: Omit<Estudiante, 'id'> & { id?: number },
  ): Observable<Estudiante & { temporaryPassword?: string; usuario?: string }> {
    return this.save('estudiantes', person.id, {
      ...this.fields(person),
      fechaNacimiento: person.fechaNacimiento,
      paraleloId: person.paraleloId || null,
    }).pipe(
      map((saved) => ({
        ...toStudent({ ...saved, paraleloId: person.paraleloId }),
        ...(saved.temporaryPassword
          ? {
              temporaryPassword: saved.temporaryPassword,
              usuario: saved.usuario ?? undefined,
            }
          : {}),
      })),
    );
  }
  inscribir(studentId: number, classGroupId: number): Observable<Estudiante> {
    return this.http
      .put(`${this.base}/estudiantes/${studentId}/inscripcion`, {
        paraleloId: classGroupId || null,
      })
      .pipe(
        switchMap(() => this.estudiantes()),
        map((rows) => rows.find((row) => row.id === studentId)!),
      );
  }
  guardarPadre(
    person: Omit<Tutor, 'id'> & { id?: number },
    children: HijoDeTutor[],
  ): Observable<Tutor> {
    return this.save('padres', person.id, {
      ...this.fields(person),
      ocupacion: person.ocupacion,
      hijos: children,
    }).pipe(map(toParent));
  }
  eliminarPadre(person: Tutor): Observable<void> {
    return this.http.delete<void>(`${this.base}/padres/${person.id}`);
  }
  private save(
    path: string,
    id: number | undefined,
    body: Record<string, unknown>,
  ): Observable<ApiPerson> {
    if (!body['nombres'] || !body['primerApellido'])
      return throwError(
        () =>
          new Error('Escribe los nombres y el primer apellido por separado.'),
      );
    return id
      ? this.http.patch<ApiPerson>(`${this.base}/${path}/${id}`, body)
      : this.http.post<ApiPerson>(`${this.base}/${path}`, body);
  }
  private fields(
    person: PersonNameFields & {
      ci: string;
      telefono?: string;
      email?: string;
    },
  ) {
    return {
      nombres: person.givenNames?.trim(),
      primerApellido: person.firstSurname?.trim(),
      segundoApellido: person.secondSurname?.trim() ?? '',
      ci: person.ci,
      telefono: person.telefono ?? '',
      correo: person.email ?? '',
    };
  }
}
