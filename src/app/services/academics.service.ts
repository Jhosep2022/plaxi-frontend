import { Injectable, inject } from '@angular/core';
import { Observable, of, map, switchMap } from 'rxjs';
import {
  Asignacion,
  Aula,
  Docente,
  Gestion,
  Materia,
  Paralelo,
} from '../core/models/academics.model';
import { SchoolApiService } from '../core/api/school-api.service';

type ApiClassGroup = Omit<Paralelo, 'aulaId' | 'estudiantes'> & {
  aulaId: number | null;
  estudiantes?: number;
};
export const toClassGroup = (group: ApiClassGroup): Paralelo => ({
  ...group,
  aulaId: group.aulaId ?? 0,
  estudiantes: group.estudiantes ?? 0,
});

@Injectable({ providedIn: 'root' })
export class AcademicsService {
  private readonly api = inject(SchoolApiService);
  getAcademicYears(spaceId: number): Observable<Gestion[]> {
    return this.api.http.get<Gestion[]>(this.api.url('gestiones', spaceId));
  }
  getActiveAcademicYear(spaceId: number): Observable<Gestion | undefined> {
    if (['estudiante', 'padre'].includes(this.api.session.activeRole() ?? ''))
      return this.api
        .member()
        .pipe(map((member) => member.gestion ?? undefined));
    return this.getAcademicYears(spaceId).pipe(
      map((years) => years.find((year) => year.estado === 'activa')),
    );
  }
  saveAcademicYear(
    year: Omit<Gestion, 'id'> & { id?: number },
  ): Observable<Gestion> {
    return this.save('gestiones', year.id, {
      anio: year.anio,
      tipoPeriodo: year.tipoPeriodo,
      periodos: year.periodos,
    });
  }
  activateAcademicYear(year: Gestion): Observable<Gestion> {
    return this.api.http.post<Gestion>(
      this.api.url(`gestiones/${year.id}/activar`),
      {},
    );
  }
  deleteAcademicYear(year: Gestion): Observable<void> {
    return this.remove('gestiones', year.id);
  }
  getClassrooms(spaceId: number): Observable<Aula[]> {
    return this.api.http.get<Aula[]>(this.api.url('aulas-fisicas', spaceId));
  }
  saveClassroom(room: Omit<Aula, 'id'> & { id?: number }): Observable<Aula> {
    return this.save('aulas-fisicas', room.id, {
      nombre: room.nombre,
      tipo: room.tipo,
      capacidad: room.capacidad,
      ubicacion: room.ubicacion,
      activa: room.activa,
    });
  }
  deleteClassroom(room: Aula): Observable<void> {
    return this.remove('aulas-fisicas', room.id);
  }
  getClassGroups(spaceId: number, yearId: number): Observable<Paralelo[]> {
    return this.api.http
      .get<ApiClassGroup[]>(this.api.url('paralelos', spaceId), {
        params: { gestion: yearId },
      })
      .pipe(map((groups) => groups.map(toClassGroup)));
  }
  getActiveClassGroups(spaceId: number): Observable<Paralelo[]> {
    return this.getActiveAcademicYear(spaceId).pipe(
      switchMap((year) =>
        year ? this.getClassGroups(spaceId, year.id) : of([]),
      ),
    );
  }
  saveClassGroup(
    group: Omit<Paralelo, 'id'> & { id?: number },
  ): Observable<Paralelo> {
    return this.save<ApiClassGroup>('paralelos', group.id, {
      gestionId: group.gestionId,
      nivel: group.nivel,
      grado: group.grado,
      letra: group.letra,
      turno: group.turno,
      aulaId: group.aulaId || null,
      capacidad: group.capacidad,
    }).pipe(map(toClassGroup));
  }
  deleteClassGroup(group: Paralelo): Observable<void> {
    return this.remove('paralelos', group.id);
  }
  getSubjects(spaceId: number): Observable<Materia[]> {
    return this.api.http.get<Materia[]>(this.api.url('materias', spaceId));
  }
  saveSubject(
    subject: Omit<Materia, 'id'> & { id?: number },
  ): Observable<Materia> {
    return this.save('materias', subject.id, {
      nombre: subject.nombre,
      nivel: subject.nivel,
      horasSemanales: subject.horasSemanales,
      icono: subject.icono,
      tono: subject.tono,
    });
  }
  deleteSubject(subject: Materia): Observable<void> {
    return this.remove('materias', subject.id);
  }
  getStudentClassGroup(_userId: number): Observable<number> {
    return this.api.member().pipe(map((member) => member.paralelo?.id ?? 0));
  }
  getChildren(_parentId: number): Observable<number[]> {
    return this.api
      .member()
      .pipe(map((member) => member.hijos.map((child) => child.id)));
  }
  getTeachers(spaceId: number): Observable<Docente[]> {
    if (this.api.session.activeRole() === 'docente')
      return this.api.member().pipe(
        map((member) =>
          member.fichas
            .filter((person) => person.tipo === 'docente')
            .map((person) => ({
              ...person,
              especialidad: '',
              telefono: '',
              email: '',
              activo: true,
            })),
        ),
      );
    return this.api.http
      .get<(Docente & { correo: string; activa: boolean })[]>(
        this.api.url('docentes', spaceId),
      )
      .pipe(
        map((people) =>
          people.map((person) => ({
            ...person,
            email: person.correo,
            activo: person.activa,
          })),
        ),
      );
  }
  getAllocations(spaceId: number, yearId: number): Observable<Asignacion[]> {
    return this.api.http.get<Asignacion[]>(
      this.api.url('asignaciones', spaceId),
      { params: { gestion: yearId } },
    );
  }
  getActiveAllocations(spaceId: number): Observable<Asignacion[]> {
    return this.getActiveAcademicYear(spaceId).pipe(
      switchMap((year) =>
        year ? this.getAllocations(spaceId, year.id) : of([]),
      ),
    );
  }
  assignTeacher(
    spaceId: number,
    yearId: number,
    classGroupId: number,
    subjectId: number,
    teacherId: number,
  ): Observable<void> {
    if (teacherId)
      return this.api.http
        .put(this.api.url('asignaciones', spaceId), {
          paraleloId: classGroupId,
          materiaId: subjectId,
          docenteId: teacherId,
        })
        .pipe(map(() => undefined));
    return this.getAllocations(spaceId, yearId).pipe(
      switchMap((rows) => {
        const allocation = rows.find(
          (row) =>
            row.paraleloId === classGroupId && row.materiaId === subjectId,
        );
        return allocation
          ? this.remove('asignaciones', allocation.id)
          : of(undefined);
      }),
    );
  }
  private save<T>(
    path: string,
    id: number | undefined,
    body: unknown,
  ): Observable<T> {
    return id
      ? this.api.http.patch<T>(this.api.url(`${path}/${id}`), body)
      : this.api.http.post<T>(this.api.url(path), body);
  }
  private remove(path: string, id: number): Observable<void> {
    return this.api.http.delete<void>(this.api.url(`${path}/${id}`));
  }
}
