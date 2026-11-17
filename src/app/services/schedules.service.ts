import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  ClaseHorario,
  ConfigJornada,
  IconoMateria,
  Materia,
  Paralelo,
} from '../core/models/academics.model';
import { DatosHorario } from '../core/utils/schedule';
import { Tono } from '../shared/dashboard/dashboard.models';
import { SchoolApiService, SchoolMember } from '../core/api/school-api.service';
import { AcademicsService, toClassGroup } from './academics.service';

interface ApiClass {
  id: number;
  dia: number;
  bloque: number;
  paralelo: { id: number; etiqueta: string };
  materia: { id: number; nombre: string; icono: IconoMateria; tono: Tono };
  docente: { id: number; nombre: string } | null;
  aula: { id: number; nombre: string } | null;
}
interface ApiSchedule {
  jornada: ConfigJornada;
  clases: ApiClass[];
}

@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private readonly api = inject(SchoolApiService);
  private readonly academics = inject(AcademicsService);
  getWorkday(spaceId: number): Observable<ConfigJornada> {
    return this.api.http
      .get<ConfigJornada>(this.api.url('jornada', spaceId))
      .pipe(map((workday) => ({ ...workday, espacioId: spaceId })));
  }
  previewWorkdayChanges(workday: ConfigJornada): Observable<number> {
    return this.api.http
      .post<{ quitadas: number }>(
        this.api.url('jornada/previsualizar'),
        workdayBody(workday),
      )
      .pipe(map((result) => result.quitadas));
  }
  saveWorkday(workday: ConfigJornada): Observable<{ quitadas: number }> {
    return this.api.http.put<{ quitadas: number }>(
      this.api.url('jornada'),
      workdayBody(workday),
    );
  }
  getActiveClasses(spaceId: number): Observable<ClaseHorario[]> {
    return forkJoin({
      schedule: this.api.http.get<ApiSchedule>(
        this.api.url('horario', spaceId),
      ),
      year: this.academics.getActiveAcademicYear(spaceId),
    }).pipe(
      map(({ schedule, year }) =>
        schedule.clases.map((entry) => toClass(entry, spaceId, year?.id ?? 0)),
      ),
    );
  }
  saveClass(entry: Omit<ClaseHorario, 'id'>): Observable<ClaseHorario> {
    return this.api.http
      .put<ApiClass>(this.api.url('horario/clases'), {
        paraleloId: entry.paraleloId,
        dia: entry.dia,
        bloque: entry.bloque,
        materiaId: entry.materiaId,
        aulaId: entry.aulaId || null,
      })
      .pipe(map((saved) => toClass(saved, entry.espacioId, entry.gestionId)));
  }
  deleteClass(id: number): Observable<void> {
    return this.api.http.delete<void>(this.api.url(`horario/clases/${id}`));
  }
  getScheduleData(spaceId: number): Observable<DatosHorario> {
    if (this.api.session.activeRole() !== 'direccion')
      return this.getPersonalSchedule(spaceId);
    return forkJoin({
      jornada: this.getWorkday(spaceId),
      paralelos: this.academics.getActiveClassGroups(spaceId),
      asignaciones: this.academics.getActiveAllocations(spaceId),
      clases: this.getActiveClasses(spaceId),
      materias: this.academics.getSubjects(spaceId),
      docentes: this.academics.getTeachers(spaceId),
      aulas: this.academics.getClassrooms(spaceId),
    });
  }
  private getPersonalSchedule(spaceId: number): Observable<DatosHorario> {
    return forkJoin({
      schedule: this.api.http.get<ApiSchedule>(
        this.api.url('horario/mio', spaceId),
      ),
      member: this.api.member(),
      groups:
        this.api.session.activeRole() === 'docente'
          ? this.academics.getActiveClassGroups(spaceId)
          : this.api.member().pipe(map((member) => memberGroups(member))),
      subjects:
        this.api.session.activeRole() === 'docente'
          ? this.academics.getSubjects(spaceId)
          : of([]),
      allocations:
        this.api.session.activeRole() === 'docente'
          ? this.academics.getActiveAllocations(spaceId)
          : of(undefined),
    }).pipe(
      map(
        ({
          schedule,
          member,
          groups,
          subjects: actualSubjects,
          allocations,
        }) => {
          const yearId = member.gestion?.id ?? 0;
          const classes = schedule.clases;
          const unique = <T extends { id: number }>(entries: T[]) => [
            ...new Map(entries.map((entry) => [entry.id, entry])).values(),
          ];
          const subjects: Materia[] = actualSubjects.length
            ? actualSubjects
            : unique(
                classes.map((entry) => ({
                  ...entry.materia,
                  espacioId: spaceId,
                  nivel:
                    groups.find((group) => group.id === entry.paralelo.id)
                      ?.nivel ?? 'primaria',
                  horasSemanales: 0,
                })),
              );
          const allocationClasses = [
            ...new Map(
              classes
                .filter((entry) => entry.docente)
                .map((entry) => [
                  `${entry.paralelo.id}:${entry.materia.id}`,
                  entry,
                ]),
            ).values(),
          ];
          return {
            currentTeacherId: member.fichas.find(
              (person) => person.tipo === 'docente',
            )?.id,
            jornada: { ...schedule.jornada, espacioId: spaceId },
            paralelos: groups,
            clases: classes.map((entry) => toClass(entry, spaceId, yearId)),
            materias: subjects,
            asignaciones:
              allocations ??
              allocationClasses.map((entry) => ({
                id: entry.id,
                espacioId: spaceId,
                gestionId: yearId,
                paraleloId: entry.paralelo.id,
                materiaId: entry.materia.id,
                docenteId: entry.docente!.id,
              })),
            docentes: unique(
              classes.flatMap((entry) =>
                entry.docente
                  ? [
                      {
                        ...entry.docente,
                        especialidad: '',
                        ci: '',
                        telefono: '',
                        email: '',
                        activo: true,
                      },
                    ]
                  : [],
              ),
            ),
            aulas: unique(
              classes.flatMap((entry) =>
                entry.aula
                  ? [
                      {
                        ...entry.aula,
                        espacioId: spaceId,
                        tipo: 'otro' as const,
                        capacidad: 0,
                        ubicacion: '',
                        activa: true,
                      },
                    ]
                  : [],
              ),
            ),
          };
        },
      ),
    );
  }
}

function memberGroups(member: SchoolMember): Paralelo[] {
  const groups = [
    member.paralelo,
    ...member.hijos.map((child) => child.paralelo),
  ].filter((group) => group !== null);
  return [
    ...new Map(groups.map((group) => [group.id, toClassGroup(group)])).values(),
  ];
}
function toClass(
  entry: ApiClass,
  spaceId: number,
  yearId: number,
): ClaseHorario {
  return {
    id: entry.id,
    espacioId: spaceId,
    gestionId: yearId,
    paraleloId: entry.paralelo.id,
    materiaId: entry.materia.id,
    aulaId: entry.aula?.id ?? 0,
    dia: entry.dia,
    bloque: entry.bloque,
  };
}
function workdayBody(workday: ConfigJornada) {
  return {
    duracionPeriodoMin: workday.duracionPeriodoMin,
    dias: workday.dias,
    turnos: workday.turnos,
  };
}
