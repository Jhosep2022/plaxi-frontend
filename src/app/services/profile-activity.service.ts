import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';
import type { Membership } from '../core/models/space.model';
import type { ProfileIndicator, ProfileSpace } from '../core/models/profile.model';
import { calculatePercentage } from '../core/utils/reports';
import { MOCK_AULAS_VIRTUALES } from '../mocks/classrooms.mock';
import { MOCK_DELAY, MOCK_ESPACIOS, MOCK_INSCRIPCIONES, MOCK_MEMBRESIAS } from '../mocks/mock-data';
import { MOCK_MIEMBRO_DESDE } from '../mocks/profile.mock';
import { AcademyService } from './academy.service';
import { AcademicsService } from './academics.service';
import { AttendanceService } from './attendance.service';
import { ClassroomsService } from './classrooms.service';
import { TimeTrackingService } from './time-tracking.service';
import { PeopleService } from './people.service';
import { SessionsService } from './sessions.service';
import { AssignmentsService } from './assignments.service';

// Activity shown only on "Mi perfil": the header indicators of each role and "Mis espacios".
// It is separate from AccountProfileService so the side menu does not load classrooms, grades or attendance
// when the app opens (that kept the initial bundle over 1 MB).
// MOCK: spaces and indicators come from simulated data until each module is connected to the API.
@Injectable({ providedIn: 'root' })
export class ProfileActivityService {
  private aulas = inject(ClassroomsService);
  private academia = inject(AcademyService);
  private academico = inject(AcademicsService);
  private asistencia = inject(AttendanceService);
  private marcacion = inject(TimeTrackingService);
  private personas = inject(PeopleService);
  private sesiones = inject(SessionsService);
  private tareas = inject(AssignmentsService);

  // ---------- Espacios ----------
  espacios(usuarioId: number): Observable<ProfileSpace[]> {
    const lista = MOCK_MEMBRESIAS.filter((m) => m.usuarioId === usuarioId).map((m): ProfileSpace => {
      const espacio = MOCK_ESPACIOS.find((e) => e.id === m.espacioId)!;
      const motivo =
        m.rol === 'direccion' ? 'Administras este espacio.'
        : espacio.tipo === 'academia' && m.rol === 'docente' ? 'Es tu academia.'
        : espacio.tipo === 'colegio' ? 'Para salir del colegio habla con la dirección.'
        : '';
      return { espacioId: espacio.id, slug: espacio.slug, nombre: espacio.nombre, tipo: espacio.tipo, rol: m.rol, desde: MOCK_MIEMBRO_DESDE[`${usuarioId}-${espacio.id}`] ?? '', puedeSalir: !motivo, motivo };
    });
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  // Sale de una academia: se quitan la membresía y sus inscripciones a los cursos
  salirDeEspacio(usuarioId: number, espacioId: number): Observable<void> {
    const i = MOCK_MEMBRESIAS.findIndex((m) => m.usuarioId === usuarioId && m.espacioId === espacioId);
    const espacio = MOCK_ESPACIOS.find((e) => e.id === espacioId);
    if (i < 0 || !espacio) return throwError(() => new Error('Ya no perteneces a este espacio.'));
    if (espacio.tipo !== 'academia' || MOCK_MEMBRESIAS[i].rol !== 'estudiante') return throwError(() => new Error('No puedes salir de este espacio.'));
    MOCK_MEMBRESIAS.splice(i, 1);
    const cursos = new Set(MOCK_AULAS_VIRTUALES.filter((a) => a.espacioId === espacioId && a.tipo === 'curso').map((a) => a.id - 1000));
    for (let j = MOCK_INSCRIPCIONES.length - 1; j >= 0; j--) {
      if (MOCK_INSCRIPCIONES[j].usuarioId === usuarioId && cursos.has(MOCK_INSCRIPCIONES[j].cursoId)) MOCK_INSCRIPCIONES.splice(j, 1);
    }
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // ---------- Indicadores de la cabecera (según el rol en el espacio activo) ----------
  indicadores(membresia: Membership, usuarioId: number): Observable<ProfileIndicator[]> {
    const espacioId = membresia.espacio.id;
    const colegio = membresia.espacio.tipo === 'colegio';
    switch (membresia.rol) {
      case 'docente':
        return colegio
          ? forkJoin({ aulas: this.aulas.aulasDocente(espacioId, usuarioId), marcas: this.marcacion.getTeacherEntries(usuarioId) }).pipe(
              map(({ aulas, marcas }): ProfileIndicator[] => {
                const entradas = marcas.filter((m) => m.tipo === 'entrada');
                return [
                  { label: 'Clases', valor: String(aulas.length), detalle: 'asignadas esta gestión', tono: 'lima' },
                  { label: 'Estudiantes', valor: String(aulas.reduce((s, a) => s + a.estudiantes, 0)), detalle: 'en todas tus clases', tono: 'azul' },
                  { label: 'Por revisar', valor: String(aulas.reduce((s, a) => s + a.pendientes, 0)), detalle: 'entregas de tareas', tono: 'crema' },
                  { label: 'Puntualidad', valor: entradas.length ? `${calculatePercentage(entradas.filter((m) => m.estado === 'a-tiempo').length, entradas.length)}%` : '—', detalle: 'entradas a tiempo', tono: 'lima' },
                ];
              })
            )
          : forkJoin({ aulas: this.aulas.aulasDocente(espacioId, usuarioId), estudiantes: this.academia.getStudents(espacioId, usuarioId), sesiones: this.sesiones.sesionesDocente(espacioId, usuarioId) }).pipe(
              map(({ aulas, estudiantes, sesiones }): ProfileIndicator[] => [
                { label: 'Cursos', valor: String(aulas.length), detalle: 'publicados y privados', tono: 'lima' },
                { label: 'Estudiantes', valor: String(estudiantes.length), detalle: 'inscritos activos', tono: 'azul' },
                { label: 'Sesiones', valor: String(sesiones.filter((s) => s.estado === 'finalizada').length), detalle: 'en vivo dictadas', tono: 'crema' },
                { label: 'Por revisar', valor: String(aulas.reduce((s, a) => s + a.pendientes, 0)), detalle: 'entregas de tareas', tono: 'lima' },
              ])
            );
      case 'estudiante':
        return forkJoin({
          aulas: this.aulas.aulasEstudiante(espacioId, usuarioId),
          asistencia: colegio
            ? this.asistencia.getStudentRecords(usuarioId).pipe(map((r) => r.filter((x) => x.estado !== 'licencia')), map((r) => porcentajeOpt(r.filter((x) => x.estado !== 'ausente').length, r.length)))
            : this.sesiones.sesionesEstudiante(espacioId, usuarioId).pipe(map((s) => s.filter((x) => x.estado === 'finalizada')), map((s) => porcentajeOpt(s.filter((x) => x.asisti).length, s.length))),
        }).pipe(
          map(({ aulas, asistencia }): ProfileIndicator[] => {
            const avances = aulas.map((a) => a.anillos[0].valor).filter((v): v is number => v !== null);
            return [
              { label: colegio ? 'Materias' : 'Cursos', valor: String(aulas.length), detalle: colegio ? 'en tu paralelo' : 'inscritos', tono: 'lima' },
              { label: 'Mi progreso', valor: avances.length ? `${Math.round(avances.reduce((s, v) => s + v, 0) / avances.length)}%` : '—', detalle: 'del contenido visto', tono: 'azul' },
              { label: 'Asistencia', valor: asistencia, detalle: colegio ? 'de tus clases' : 'de las sesiones en vivo', tono: 'lima' },
              { label: 'Tareas', valor: String(aulas.reduce((s, a) => s + a.pendientes, 0)), detalle: 'por entregar', tono: 'crema' },
            ];
          })
        );
      case 'padre':
        return this.academico.getChildren(usuarioId).pipe(
          switchMap((hijos) =>
            (hijos.length ? forkJoin(hijos.map((h) => this.tareas.tareasDeEstudiante(espacioId, h))) : of([])).pipe(
              map((listas): ProfileIndicator[] => [
                { label: 'Hijos', valor: String(hijos.length), detalle: 'vinculados a tu cuenta', tono: 'lima' },
                { label: 'Tareas', valor: String(listas.flat().filter((t) => t.estado === 'pendiente' || t.estado === 'no-entregada').length), detalle: 'pendientes de tus hijos', tono: 'crema' },
                { label: 'Espacios', valor: String(MOCK_MEMBRESIAS.filter((m) => m.usuarioId === usuarioId).length), detalle: 'a los que perteneces', tono: 'azul' },
              ])
            )
          )
        );
      default:
        return forkJoin({ estudiantes: this.personas.estudiantes(), docentes: this.personas.docentes(), paralelos: this.academico.getActiveClassGroups(espacioId), materias: this.academico.getSubjects(espacioId) }).pipe(
          map(({ estudiantes, docentes, paralelos, materias }): ProfileIndicator[] => [
            { label: 'Estudiantes', valor: String(estudiantes.length), detalle: 'en la institución', tono: 'lima' },
            { label: 'Docentes', valor: String(docentes.filter((d) => d.activo).length), detalle: 'activos', tono: 'azul' },
            { label: 'Paralelos', valor: String(paralelos.length), detalle: 'esta gestión', tono: 'crema' },
            { label: 'Materias', valor: String(materias.length), detalle: 'en el plan', tono: 'lima' },
          ])
        );
    }
  }
}

function porcentajeOpt(parte: number, total: number): string {
  return total ? `${calculatePercentage(parte, total)}%` : '—';
}
