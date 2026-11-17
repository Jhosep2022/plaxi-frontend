import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import {
  EstadoAsistencia,
  EstadoLicencia,
  Estudiante,
  Licencia,
  RegistroAsistencia,
} from '../core/models/attendance.model';
import { SchoolApiService } from '../core/api/school-api.service';
import { PeopleService } from './people.service';

export interface MarcaAsistencia {
  estudianteId: number;
  estado: EstadoAsistencia;
  minutosTarde: number;
}
export interface ClaseDelDia {
  espacioId: number;
  paraleloId: number;
  materiaId: number;
  bloque: number;
  fecha: string;
  docenteId: number;
}
interface ApiLeave extends Omit<Licencia, 'solicitadaPor'> {
  solicitadaPor: number | null;
  solicitante?: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(SchoolApiService);
  private readonly people = inject(PeopleService);
  getStudents(): Observable<Estudiante[]> {
    if (['estudiante', 'padre'].includes(this.api.session.activeRole() ?? ''))
      return this.api.member().pipe(
        map((member) => {
          const own = member.fichas
            .filter((person) => person.tipo === 'estudiante')
            .map((person) => ({ ...person, paralelo: member.paralelo }));
          return [...own, ...member.hijos].map((person) => ({
            id: person.id,
            nombre: person.nombre,
            givenNames: person.nombres,
            firstSurname: person.primerApellido,
            secondSurname: person.segundoApellido,
            ci: person.ci,
            fechaNacimiento: person.fechaNacimiento ?? '',
            paraleloId: person.paralelo?.id ?? 0,
          }));
        }),
      );
    return this.people.estudiantes();
  }
  getClassRoster(entry: { paraleloId: number; bloque: number; fecha: string }) {
    return this.api.http.get<{
      editable: boolean;
      motivoNoEditable: string;
      estudiantes: { id: number; conLicencia: boolean }[];
    }>(this.api.url('asistencia/clase'), { params: { ...entry } });
  }
  getStudentsByClassGroup(classGroupId: number): Observable<Estudiante[]> {
    return this.getStudents().pipe(
      map((rows) => rows.filter((row) => row.paraleloId === classGroupId)),
    );
  }
  getClassRecords(
    entry: Omit<ClaseDelDia, 'docenteId' | 'espacioId'>,
  ): Observable<RegistroAsistencia[]> {
    return this.records({ desde: entry.fecha, hasta: entry.fecha }).pipe(
      map((rows) =>
        rows.filter(
          (row) =>
            row.paraleloId === entry.paraleloId &&
            row.materiaId === entry.materiaId &&
            row.bloque === entry.bloque,
        ),
      ),
    );
  }
  getStudentRecords(studentId: number): Observable<RegistroAsistencia[]> {
    const actualId =
      this.api.session.activeRole() === 'estudiante'
        ? this.api
            .member()
            .pipe(
              map(
                (member) =>
                  member.fichas.find((person) => person.tipo === 'estudiante')
                    ?.id ?? 0,
              ),
            )
        : of(studentId);
    return actualId.pipe(
      switchMap((id) => (id ? this.records({ estudianteId: id }) : of([]))),
    );
  }
  getRecordsBetween(
    _spaceId: number,
    from: string,
    to: string,
  ): Observable<RegistroAsistencia[]> {
    return this.records({ desde: from, hasta: to });
  }
  saveAttendance(
    entry: ClaseDelDia,
    marks: MarcaAsistencia[],
  ): Observable<number> {
    return this.api.http
      .put<{ guardados: number }>(this.api.url('asistencia/clase'), {
        paraleloId: entry.paraleloId,
        bloque: entry.bloque,
        fecha: entry.fecha,
        marcas: marks,
      })
      .pipe(map((result) => result.guardados));
  }
  getTolerance(_teacherId: number): Observable<number> {
    return this.api.http
      .get<{ toleranciaMin: number }>(this.api.url('asistencia/tolerancia'))
      .pipe(map((result) => result.toleranciaMin));
  }
  saveTolerance(_teacherId: number, minutes: number): Observable<number> {
    return this.api.http
      .put<{ toleranciaMin: number }>(this.api.url('asistencia/tolerancia'), {
        toleranciaMin: minutes,
      })
      .pipe(map((result) => result.toleranciaMin));
  }
  getLeaveRequesters(): Observable<Map<number, string>> {
    return this.api.http
      .get<ApiLeave[]>(this.api.url('licencias'))
      .pipe(
        map(
          (rows) =>
            new Map(
              rows.map((row) => [
                row.solicitadaPor ?? 0,
                row.solicitante ?? 'Dirección',
              ]),
            ),
        ),
      );
  }
  getLeaveRequests(_spaceId: number): Observable<Licencia[]> {
    return this.api.http.get<ApiLeave[]>(this.api.url('licencias')).pipe(
      map((rows) =>
        rows.map((row) => ({
          ...row,
          solicitadaPor: row.solicitadaPor ?? 0,
        })),
      ),
    );
  }
  getStudentLeaveRequests(studentId: number): Observable<Licencia[]> {
    return this.getLeaveRequests(this.api.session.activeSpace()!.id).pipe(
      map((rows) =>
        this.api.session.activeRole() === 'estudiante'
          ? rows
          : rows.filter((row) => row.estudianteId === studentId),
      ),
    );
  }
  requestLeave(
    leave: Omit<Licencia, 'id' | 'estado' | 'respuesta' | 'creada'>,
  ): Observable<Licencia> {
    return this.api.http
      .post<ApiLeave>(this.api.url('licencias'), {
        estudianteId: leave.estudianteId,
        desde: leave.desde,
        hasta: leave.hasta,
        motivo: leave.motivo,
        archivo: leave.archivo,
      })
      .pipe(map((row) => ({ ...row, solicitadaPor: row.solicitadaPor ?? 0 })));
  }
  respondToLeaveRequest(
    leave: Licencia,
    status: Exclude<EstadoLicencia, 'pendiente'>,
    message: string,
  ): Observable<Licencia> {
    return this.api.http
      .post<ApiLeave>(this.api.url(`licencias/${leave.id}/respuesta`), {
        estado: status,
        respuesta: message,
      })
      .pipe(map((row) => ({ ...row, solicitadaPor: row.solicitadaPor ?? 0 })));
  }
  private records(
    params: Record<string, string | number>,
  ): Observable<RegistroAsistencia[]> {
    return this.api.http.get<RegistroAsistencia[]>(
      this.api.url('asistencia/registros'),
      { params },
    );
  }
}
