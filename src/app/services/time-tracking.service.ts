import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, tap } from 'rxjs';
import { Turno } from '../core/models/academics.model';
import {
  HorarioLaboral,
  Marcacion,
  PuntoMarcacion,
  TipoMarcacion,
} from '../core/models/time-tracking.model';
import { dayOfWeek } from '../core/utils/attendance';
import { docenteDe, rangoDeBloque, DatosHorario } from '../core/utils/schedule';
import { SchoolApiService } from '../core/api/school-api.service';
import { environment } from '../../environments/environment';
import { SchedulesService } from './schedules.service';

export interface SolicitudMarcacion {
  espacioId: number;
  docenteId: number;
  tipo: TipoMarcacion;
  puntoId: number;
  codigo: string;
  latitud: number;
  longitud: number;
}
export interface Esperado {
  turno: Turno;
  entrada: string;
  salida: string;
  primeraClase: string;
}
export interface TimeClockDisplay {
  espacio: string;
  punto: { id: number; nombre: string };
  codigo: string;
  contenido: string;
  segundosRestantes: number;
}

@Injectable({ providedIn: 'root' })
export class TimeTrackingService {
  private readonly api = inject(SchoolApiService);
  private readonly schedules = inject(SchedulesService);
  private readonly context = signal<{
    spaceId: number;
    data: DatosHorario;
    work: HorarioLaboral;
  } | null>(null);
  getLocations(spaceId: number): Observable<PuntoMarcacion[]> {
    return this.api.http
      .get<PuntoMarcacion[]>(this.api.url('marcacion/puntos', spaceId))
      .pipe(map((rows) => rows.map((row) => ({ ...row, espacioId: spaceId }))));
  }
  saveLocation(
    point: Pick<
      PuntoMarcacion,
      'nombre' | 'latitud' | 'longitud' | 'radioM' | 'activo'
    > & { id?: number; espacioId?: number },
  ): Observable<PuntoMarcacion> {
    const body = {
      nombre: point.nombre,
      latitud: point.latitud,
      longitud: point.longitud,
      radioM: point.radioM,
      activo: point.activo,
    };
    return point.id
      ? this.api.http.patch<PuntoMarcacion>(
          this.api.url(`marcacion/puntos/${point.id}`),
          body,
        )
      : this.api.http.post<PuntoMarcacion>(
          this.api.url('marcacion/puntos'),
          body,
        );
  }
  deleteLocation(id: number): Observable<void> {
    return this.api.http.delete<void>(this.api.url(`marcacion/puntos/${id}`));
  }
  enableDisplay(id: number) {
    return this.api.http.post<{ token: string; puntoId: number }>(
      this.api.url(`marcacion/puntos/${id}/pantalla`),
      {},
    );
  }
  revokeDisplay(id: number) {
    return this.api.http.delete<void>(
      this.api.url(`marcacion/puntos/${id}/pantalla`),
    );
  }
  getDisplay(slug: string, token: string) {
    return this.api.http.get<TimeClockDisplay>(
      `${environment.API_URL}/espacios/${encodeURIComponent(slug)}/marcacion/pantalla/${encodeURIComponent(token)}`,
    );
  }
  getWorkSchedule(spaceId: number): Observable<HorarioLaboral> {
    return this.api.http
      .get<HorarioLaboral>(this.api.url('marcacion/horario-laboral', spaceId))
      .pipe(map((work) => ({ ...work, id: spaceId })));
  }
  saveWorkSchedule(work: HorarioLaboral): Observable<HorarioLaboral> {
    return this.api.http
      .put<HorarioLaboral>(this.api.url('marcacion/horario-laboral'), {
        toleranciaMin: work.toleranciaMin,
        turnos: work.turnos,
      })
      .pipe(
        map((saved) => ({ ...saved, id: work.id })),
        tap((saved) =>
          this.context.update((context) =>
            context?.spaceId === saved.id
              ? { ...context, work: saved }
              : context,
          ),
        ),
      );
  }
  getExpectedAttendance(
    spaceId: number,
    teacherId: number,
    date: string,
  ): Esperado | null {
    const context = this.context();
    if (!context || context.spaceId !== spaceId) return null;
    const { data, work } = context;
    if (!data.jornada.dias.includes(dayOfWeek(date))) return null;
    const actualId = data.currentTeacherId ?? teacherId;
    const classes = data.clases
      .filter(
        (entry) =>
          entry.dia === dayOfWeek(date) &&
          docenteDe(data.asignaciones, entry.paraleloId, entry.materiaId) ===
            actualId,
      )
      .map((entry) => ({
        entry,
        time: rangoDeBloque(data, entry.paraleloId, entry.bloque),
      }))
      .filter((entry) => entry.time)
      .sort((left, right) =>
        left.time!.inicio.localeCompare(right.time!.inicio),
      );
    if (!classes.length) return null;
    const shift = data.paralelos.find(
      (group) => group.id === classes[0].entry.paraleloId,
    )?.turno;
    const schedule =
      work.turnos.find((entry) => entry.turno === shift) ?? work.turnos[0];
    return schedule
      ? {
          turno: shift ?? 'manana',
          entrada: schedule.entrada,
          salida: schedule.salida,
          primeraClase: classes[0].time!.inicio,
        }
      : null;
  }
  getExpectedTeachers(
    spaceId: number,
    date: string,
  ): { docenteId: number; esperado: Esperado }[] {
    const context = this.context();
    if (!context || context.spaceId !== spaceId) return [];
    return [
      ...new Set(context.data.asignaciones.map((entry) => entry.docenteId)),
    ].flatMap((id) => {
      const expected = this.getExpectedAttendance(spaceId, id, date);
      return expected ? [{ docenteId: id, esperado: expected }] : [];
    });
  }
  getTeacherEntries(_teacherId: number): Observable<Marcacion[]> {
    const spaceId = this.api.session.activeSpace()!.id;
    return forkJoin({
      rows: this.api.http.get<Marcacion[]>(this.api.url('marcacion/mias')),
      context: this.loadContext(spaceId),
    }).pipe(map((result) => result.rows));
  }
  getEntriesForDay(spaceId: number, date: string): Observable<Marcacion[]> {
    return this.getEntriesBetween(spaceId, date, date);
  }
  getEntriesBetween(
    spaceId: number,
    from: string,
    to: string,
  ): Observable<Marcacion[]> {
    return forkJoin({
      rows: this.api.http.get<Marcacion[]>(
        this.api.url('marcacion/reporte', spaceId),
        { params: { desde: from, hasta: to } },
      ),
      context: this.loadContext(spaceId),
    }).pipe(map((result) => result.rows));
  }
  recordEntry(request: SolicitudMarcacion): Observable<Marcacion> {
    return this.api.http.post<Marcacion>(this.api.url('marcacion'), {
      puntoId: request.puntoId,
      codigo: request.codigo,
      tipo: request.tipo,
      latitud: request.latitud,
      longitud: request.longitud,
    });
  }
  private loadContext(spaceId: number) {
    return forkJoin({
      data: this.schedules.getScheduleData(spaceId),
      work: this.getWorkSchedule(spaceId),
    }).pipe(tap((context) => this.context.set({ ...context, spaceId })));
  }
}
