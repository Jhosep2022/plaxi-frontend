import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  faBullhorn, faCalendarDays, faChartLine, faClipboardCheck, faClock, faFileSignature, faListCheck, faQrcode, faSitemap,
  faStar, faTriangleExclamation, faUserCheck, faUserClock, faUserGraduate, faUserXmark,
} from '@fortawesome/free-solid-svg-icons';
import { IconoMateria, NIVELES, compararParalelos, paraleloLabel } from '../core/models/academics.model';
import { Estudiante, RegistroAsistencia } from '../core/models/attendance.model';
import { Membership } from '../core/models/space.model';
import { Marcacion } from '../core/models/time-tracking.model';
import { contar, dayOfWeek, getDailyStatus, formatShortDate, todayIso, addDays } from '../core/utils/attendance';
import { aprobado, boletinDe, indiceNotas, periodoDeFecha, promedio } from '../core/utils/grades';
import { DatosHorario, clasesDeDocente, itemsDeClases } from '../core/utils/schedule';
import { toTime, toMinutes } from '../core/utils/workday';
import { calculatePercentage } from '../core/utils/reports';
import { isDueSoon, formatDueDate } from '../core/utils/assignments';
import { cuando } from '../features/announcements/announcements.ui';
import { ProfileDto } from '../models/profile.dto';
import { DiaSemana, EventoHorario, ItemActividad, ItemProximo, ResumenData } from '../shared/dashboard/dashboard.models';
import { subjectIcon } from '../shared/ui/academic-icons';
import { AcademicsService } from './academics.service';
import { AttendanceService } from './attendance.service';
import { GradesService, DatosParalelo } from './grades.service';
import { TeacherClassesService } from './teacher-classes.service';
import { ComunicadoRecibido, AnnouncementsService } from './announcements.service';
import { SelectedChildService } from './selected-child.service';
import { SchedulesService } from './schedules.service';
import { TimeTrackingService } from './time-tracking.service';
import { AccountProfileService } from './account-profile.service';
import { TareaDeEstudiante, AssignmentsService } from './assignments.service';

type Semana = ResumenData['perfil']['semana'];

// Resumen (Inicio) de los roles del colegio armado con los mismos datos que usan los módulos:
// horarios, asistencia, calificaciones, tareas, comunicados y marcaciones.
@Injectable({ providedIn: 'root' })
export class SchoolSummaryService {
  private cuenta = inject(AccountProfileService);
  private horarios = inject(SchedulesService);
  private academico = inject(AcademicsService);
  private asistencia = inject(AttendanceService);
  private calificaciones = inject(GradesService);
  private clasesDocente = inject(TeacherClassesService);
  private tareas = inject(AssignmentsService);
  private comunicados = inject(AnnouncementsService);
  private marcacion = inject(TimeTrackingService);
  private hijoActivo = inject(SelectedChildService);

  // Nombre y foto del usuario, desde el perfil real (API) cuando es quien inició sesión
  private perfil(usuarioId: number): Observable<{ nombre: string; primerApellido: string; imagenUrl?: string }> {
    return this.cuenta.perfil(usuarioId).pipe(
      map((p) => ({ nombre: p?.nombre ?? '', primerApellido: p?.primerApellido ?? '', imagenUrl: p?.imagenUrl }))
    );
  }

  obtener(membresia: Membership, usuarioId: number): Observable<ResumenData> {
    switch (membresia.rol) {
      case 'docente': return this.docente(membresia, usuarioId);
      case 'estudiante': return this.estudiante(membresia, usuarioId);
      case 'padre': return this.padre(membresia, usuarioId);
      default: return this.direccion(membresia, usuarioId);
    }
  }

  // ---------- Docente ----------
  private docente({ espacio }: Membership, usuarioId: number): Observable<ResumenData> {
    const base = `/${espacio.slug}/docente`;
    return forkJoin({
      perfil: this.perfil(usuarioId),
      datos: this.horarios.datos(espacio.id),
      marcaciones: this.marcacion.getTeacherEntries(usuarioId),
      clases: this.clasesDocente.clasesDe(espacio.id, usuarioId),
      tareas: this.tareas.tareasDocente(espacio.id, usuarioId),
      recibidos: this.comunicados.recibidos(espacio.id, usuarioId),
      estudiantes: this.asistencia.getStudents(),
    }).pipe(
      map(({ perfil, datos, marcaciones, clases, tareas, recibidos, estudiantes }): ResumenData => {
        const misClases = clasesDeDocente(datos, usuarioId);
        const enRiesgo = [...clases].sort((a, b) => b.estudiantes.filter((e) => e.enRiesgo).length - a.estudiantes.filter((e) => e.enRiesgo).length)[0];
        const paraHacer: ItemActividad[] = [
          ...tareas.filter((t) => t.porRevisar > 0).map((t) => ({
            titulo: `${t.porRevisar} entregas por revisar`, detalle: `${t.titulo} · ${t.materia.nombre} ${t.curso}`, icono: faClipboardCheck, tono: 'crema' as const, meta: 'Tarea',
          })),
          ...clases.flatMap((c) => c.pendientes.slice(0, 1).map((p) => ({
            titulo: `${p.actividad.nombre} sin calificar`, detalle: `${c.titulo} · faltan ${p.faltan} notas`, icono: faStar, tono: 'azul' as const, meta: 'Notas',
          }))).slice(0, 2),
          ...sinLeer(recibidos).map((r) => ({ titulo: r.comunicado.titulo, detalle: `${r.comunicado.autorNombre} · Comunicado`, icono: faBullhorn, tono: 'lima' as const, meta: cuando(r.comunicado.enviado) })),
        ];
        return {
          saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
          subtitulo: `Esto es lo que tienes hoy en ${espacio.nombre}.`,
          accion: { label: 'Marcar entrada', icono: faQrcode, link: `${base}/marcacion` },
          progreso: clases.filter((c) => c.notasPeriodo.esperadas > 0).slice(0, 3).map((c) => ({
            titulo: c.titulo, icono: subjectIcon(c.materia.icono), tono: c.materia.tono, actual: c.notasPeriodo.cargadas, total: c.notasPeriodo.esperadas, unidad: 'notas cargadas',
          })),
          horario: horarioDeHoy(datos, misClases, 'docente', 'Mi horario de hoy'),
          proximos: {
            titulo: 'Próximas clases',
            verTodo: `${base}/horario`,
            items: conAccionEnLaPrimera(proximasDeHoy(datos, misClases, 'docente', estudiantes), { label: 'Tomar asistencia', icono: faUserCheck, link: `${base}/asistencia` }),
          },
          lista: {
            titulo: 'Mis clases',
            verTodo: `${base}/clases`,
            items: clases.map((c) => ({
              titulo: c.titulo, subtitulo: `Turno ${c.turno.toLowerCase()} · ${c.aula}`, icono: subjectIcon(c.materia.icono), tono: c.materia.tono,
              meta: `${c.estudiantes.length} est.`, link: `${base}/clases/${c.asignacion.id}`,
            })),
          },
          perfil: {
            nombre: `${perfil.nombre} ${perfil.primerApellido}`,
            organizacion: espacio.nombre,
            insignia: 'Docente',
            imagenUrl: perfil.imagenUrl,
            semana: semanaDeMarcaciones(marcaciones, (fecha) => !!this.marcacion.getExpectedAttendance(espacio.id, usuarioId, fecha)),
          },
          actividad: { titulo: 'Para hacer', verTodo: `${base}/tareas`, items: paraHacer.slice(0, 4) },
          asistente: {
            sugerencia: enRiesgo && enRiesgo.estudiantes.some((e) => e.enRiesgo)
              ? `¿Cómo puedo apoyar a los ${enRiesgo.estudiantes.filter((e) => e.enRiesgo).length} estudiantes en riesgo de ${enRiesgo.titulo}?`
              : 'Prepara una práctica de repaso para mi próxima clase',
          },
        };
      })
    );
  }

  // ---------- Estudiante ----------
  private estudiante({ espacio }: Membership, usuarioId: number): Observable<ResumenData> {
    const base = `/${espacio.slug}/estudiante`;
    return this.academico.getStudentClassGroup(usuarioId).pipe(
      switchMap((paraleloId) => forkJoin({
        perfil: this.perfil(usuarioId),
        seguimiento: this.seguimiento(espacio.id, usuarioId, paraleloId),
        recibidos: this.comunicados.recibidos(espacio.id, usuarioId),
      })),
      map(({ perfil, seguimiento: s, recibidos }): ResumenData => {
        const porEntregar = s.tareas.filter((t) => t.estado === 'pendiente' || t.estado === 'no-entregada');
        const baja = s.notas.filter((n) => n.nota !== null).sort((a, b) => a.nota! - b.nota!)[0];
        return {
          saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
          subtitulo: `Esto es lo que tienes hoy en ${espacio.nombre}.`,
          accion: { label: `Mis tareas (${porEntregar.length})`, icono: faListCheck, link: `${base}/tareas` },
          progreso: tarjetasDeNotas(s),
          horario: horarioDeHoy(s.horario, s.horario.clases.filter((c) => c.paraleloId === s.paraleloId), 'paralelo', 'Mi horario de hoy'),
          proximos: {
            titulo: 'Próximas clases',
            verTodo: `${base}/horario`,
            items: conAccionEnLaPrimera(proximasDeHoy(s.horario, s.horario.clases.filter((c) => c.paraleloId === s.paraleloId), 'paralelo', s.estudiantes), { label: 'Ver material', icono: faListCheck, link: `${base}/cursos` }),
          },
          lista: { titulo: 'Mis materias', verTodo: `${base}/calificaciones`, items: listaDeMaterias(s, `${base}/calificaciones`) },
          perfil: {
            nombre: `${perfil.nombre} ${perfil.primerApellido}`,
            organizacion: s.curso,
            insignia: s.promedio !== null ? `Promedio ${s.promedio}` : 'Estudiante',
            imagenUrl: perfil.imagenUrl,
            semana: semanaDeAsistencia(s.registros, 'días que asististe esta semana'),
          },
          actividad: {
            titulo: 'Novedades',
            verTodo: `${base}/tareas`,
            items: [...novedadesDeTareas(s.tareas, false), ...sinLeer(recibidos).map(comunicadoComoActividad)].slice(0, 4),
          },
          asistente: { sugerencia: baja ? `Ayúdame a repasar ${baja.materia} para subir mi nota de ${baja.nota}` : 'Hazme un plan de estudio para esta semana' },
        };
      })
    );
  }

  // ---------- Padre / tutor legal ----------
  private padre({ espacio }: Membership, usuarioId: number): Observable<ResumenData> {
    const base = `/${espacio.slug}/padre`;
    return this.hijoActivo.activo().pipe(
      switchMap((hijo) => {
        if (!hijo) return throwError(() => new Error('No hay estudiantes a cargo de este usuario.'));
        return forkJoin({
          perfil: this.perfil(usuarioId),
          seguimiento: this.seguimiento(espacio.id, hijo.id, hijo.paraleloId),
          recibidos: this.comunicados.recibidos(espacio.id, usuarioId),
        }).pipe(map((d) => ({ ...d, hijo })));
      }),
      map(({ perfil, seguimiento: s, recibidos, hijo }): ResumenData => {
        const nombre = hijo.nombre.split(' ')[0];
        const hoy = todayIso();
        const noLeidos = sinLeer(recibidos, 99).length;
        const eventos = recibidos.filter((r) => r.comunicado.fechaEvento >= hoy).sort((a, b) => a.comunicado.fechaEvento.localeCompare(b.comunicado.fechaEvento));
        const faltasRecientes = s.registros.filter((r) => r.fecha >= addDays(hoy, -7) && r.estado !== 'presente' && r.estado !== 'licencia');
        const baja = s.notas.filter((n) => n.nota !== null).sort((a, b) => a.nota! - b.nota!)[0];
        return {
          saludo: `¡Hola, ${perfil.nombre}!`,
          subtitulo: `Así le va a ${nombre} en ${espacio.nombre}.`,
          accion: { label: noLeidos ? `Comunicados (${noLeidos})` : 'Comunicados', icono: faBullhorn, link: `${base}/comunicados` },
          progreso: tarjetasDeNotas(s),
          horario: horarioDeHoy(s.horario, s.horario.clases.filter((c) => c.paraleloId === s.paraleloId), 'paralelo', `Horario de ${nombre} hoy`),
          proximos: {
            titulo: 'Próximos eventos',
            verTodo: `${base}/comunicados`,
            items: eventos.slice(0, 3).map((r, i): ItemProximo => ({
              titulo: r.comunicado.titulo, icono: faCalendarDays, horario: formatShortDate(r.comunicado.fechaEvento), detalle: r.comunicado.autorNombre,
              participantes: [], totalParticipantes: 0,
              accion: i === 0 && r.comunicado.pideConfirmacion && !r.lectura?.confirmado ? { label: 'Confirmar', icono: faClipboardCheck, link: `${base}/comunicados` } : undefined,
            })),
          },
          lista: {
            titulo: 'Comunicados',
            verTodo: `${base}/comunicados`,
            items: recibidos.slice(0, 3).map((r) => ({
              titulo: r.comunicado.titulo, subtitulo: `${r.comunicado.autorNombre} · ${cuando(r.comunicado.enviado)}`, icono: faBullhorn,
              tono: r.comunicado.importante ? 'crema' : 'lima', meta: r.lectura ? 'Leído' : 'Nuevo', link: `${base}/comunicados`,
            })),
          },
          perfil: {
            nombre: hijo.nombre,
            organizacion: s.curso,
            insignia: s.promedio !== null ? `Promedio ${s.promedio}` : 'A mi cargo',
            semana: semanaDeAsistencia(s.registros, `días que asistió ${nombre} esta semana`),
          },
          actividad: {
            titulo: `Novedades de ${nombre}`,
            verTodo: `${base}/hijos`,
            items: [
              ...novedadesDeTareas(s.tareas, true),
              ...s.notas.filter((n) => n.nota !== null && !aprobado(s.datos!.config, n.nota)).map((n) => ({
                titulo: `${n.materia}: ${n.nota}`, detalle: `Bajo la nota de aprobación (${s.datos!.config.notaAprobacion})`, icono: faStar, tono: 'crema' as const, meta: s.periodo,
              })),
              ...faltasRecientes.slice(0, 2).map((r) => ({
                titulo: r.estado === 'atraso' ? `Atraso de ${r.minutosTarde} min` : 'Faltó a una clase', detalle: s.nombreMateria(r.materiaId),
                icono: r.estado === 'atraso' ? faClock : faUserXmark, tono: 'crema' as const, meta: formatShortDate(r.fecha),
              })),
            ].slice(0, 4),
          },
          asistente: { sugerencia: baja ? `¿Cómo puedo ayudar a ${nombre} a mejorar en ${baja.materia}?` : `¿Cómo puedo acompañar a ${nombre} en sus estudios?` },
        };
      })
    );
  }

  // ---------- Dirección ----------
  private direccion({ espacio }: Membership, usuarioId: number): Observable<ResumenData> {
    const base = `/${espacio.slug}/direccion`;
    const hoy = todayIso();
    return forkJoin({
      perfil: this.perfil(usuarioId),
      datos: this.horarios.datos(espacio.id),
      marcaciones: this.marcacion.getEntriesBetween(espacio.id, addDays(hoy, -14), hoy),
      registros: this.asistencia.getRecordsBetween(espacio.id, addDays(hoy, -21), hoy),
      estudiantes: this.asistencia.getStudents(),
      licencias: this.asistencia.getLeaveRequests(espacio.id),
      gestion: this.academico.getActiveAcademicYear(espacio.id),
      enviados: this.comunicados.enviados(espacio.id, null),
    }).pipe(
      switchMap((d) => (d.gestion ? this.calificaciones.getClosures(espacio.id, d.gestion.id) : of([])).pipe(map((cierres) => ({ ...d, cierres })))),
      map(({ perfil, datos, marcaciones, registros, estudiantes, licencias, gestion, enviados, cierres }): ResumenData => {
        // Docentes que marcaron: hoy, o el último día con clases
        let fechaMarc = hoy;
        for (let i = 0; i < 14 && !this.marcacion.getExpectedTeachers(espacio.id, fechaMarc).length; i++) fechaMarc = addDays(fechaMarc, -1);
        const esperados = this.marcacion.getExpectedTeachers(espacio.id, fechaMarc).map((e) => e.docenteId);
        const marcaronHoy = new Set(marcaciones.filter((m) => m.fecha === fechaMarc && m.tipo === 'entrada').map((m) => m.docenteId));
        const sinMarcar = esperados.filter((id) => !marcaronHoy.has(id));

        // Asistencia de estudiantes del último día con asistencia tomada
        const fechaAsis = registros.map((r) => r.fecha).sort().at(-1) ?? hoy;
        const delDia = registros.filter((r) => r.fecha === fechaAsis);
        const porEstudiante = agrupar(delDia, (r) => r.estudianteId);
        const asistioCompleto = (rs: RegistroAsistencia[]) => ['presente', 'atraso'].includes(getDailyStatus(rs) ?? '');
        const asistieron = [...porEstudiante.values()].filter(asistioCompleto).length;

        // Avance del periodo en curso (días hábiles)
        const periodo = gestion ? gestion.periodos[periodoDeFecha(gestion, hoy)] : null;
        const habiles = (desde: string, hasta: string) => { let n = 0; for (let f = desde; f <= hasta; f = addDays(f, 1)) if (dayOfWeek(f) <= 5) n++; return n; };

        const pendientes = licencias.filter((l) => l.estado === 'pendiente');
        const sinCurso = estudiantes.filter((e) => !e.paraleloId);
        const terminadosSinCerrar = gestion ? gestion.periodos.filter((p, i) => p.fin < hoy && !cierres.some((c) => c.periodo === i)) : [];
        const nombreDocente = (id: number) => datos.docentes.find((x) => x.id === id)?.nombre ?? '';
        const alertas: ItemProximo[] = [
          ...(sinMarcar.length ? [{
            titulo: `${sinMarcar.length} ${sinMarcar.length === 1 ? 'docente sin marcar' : 'docentes sin marcar'}`, icono: faTriangleExclamation,
            horario: fechaMarc === hoy ? 'Hoy' : formatShortDate(fechaMarc), detalle: 'Entrada del personal',
            participantes: sinMarcar.map(nombreDocente), totalParticipantes: sinMarcar.length,
            accion: { label: 'Ver marcaciones', icono: faQrcode, link: `${base}/asistencia/personal` },
          }] : []),
          ...(pendientes.length ? [{
            titulo: `${pendientes.length} ${pendientes.length === 1 ? 'licencia por responder' : 'licencias por responder'}`, icono: faFileSignature,
            horario: 'Pendiente', detalle: 'Solicitadas por padres', participantes: pendientes.map((l) => estudiantes.find((e) => e.id === l.estudianteId)?.nombre ?? ''),
            totalParticipantes: pendientes.length, accion: { label: 'Revisar', icono: faFileSignature, link: `${base}/asistencia/licencias` },
          }] : []),
          ...(sinCurso.length ? [{
            titulo: `${sinCurso.length} estudiantes sin inscribir`, icono: faUserClock, horario: 'Inscripciones', detalle: 'Sin paralelo en la gestión activa',
            participantes: sinCurso.map((e) => e.nombre), totalParticipantes: sinCurso.length,
            accion: { label: 'Inscribir', icono: faUserGraduate, link: `${base}/personas/inscripciones` },
          }] : []),
          ...terminadosSinCerrar.map((p) => ({
            titulo: `${p.nombre} sin cerrar`, icono: faCalendarDays, horario: `Terminó el ${formatShortDate(p.fin)}`, detalle: 'Cierre de periodos',
            participantes: [], totalParticipantes: 0, accion: { label: 'Cerrar', icono: faCalendarDays, link: `${base}/calificaciones/periodos` },
          })),
        ];

        const porParalelo = [...datos.paralelos].sort(compararParalelos).flatMap((p) => {
          const c = contar(delDia.filter((r) => r.paraleloId === p.id));
          if (!c.total) return [];
          const alumnos = new Set(delDia.filter((r) => r.paraleloId === p.id).map((r) => r.estudianteId)).size;
          const presentes = [...agrupar(delDia.filter((r) => r.paraleloId === p.id), (r) => r.estudianteId).values()].filter(asistioCompleto).length;
          return [{
            titulo: `${paraleloLabel(p)} · ${NIVELES.find((n) => n.id === p.nivel)?.label}`, subtitulo: `${presentes} de ${alumnos} asistieron a todas sus clases · ${formatShortDate(fechaAsis)}`,
            icono: faSitemap, tono: c.porcentaje >= 95 ? 'lima' as const : c.porcentaje >= 90 ? 'azul' as const : 'crema' as const, meta: `${c.porcentaje}%`,
            link: `${base}/asistencia/estudiantes`,
          }];
        });

        const semana = semanaDelPersonal(marcaciones, (fecha) => this.marcacion.getExpectedTeachers(espacio.id, fecha).map((e) => e.docenteId));
        return {
          saludo: `¡Buen día, ${perfil.nombre}!`,
          subtitulo: `Así está ${espacio.nombre} hoy.`,
          accion: { label: 'Ver reportes', icono: faChartLine, link: `${base}/reportes` },
          progreso: [
            { titulo: `Asistencia · ${formatShortDate(fechaAsis)}`, icono: faUserGraduate, tono: 'lima', actual: asistieron, total: porEstudiante.size, unidad: 'estudiantes asistieron' },
            { titulo: 'Docentes que marcaron', icono: faQrcode, tono: 'azul', actual: esperados.length - sinMarcar.length, total: esperados.length, unidad: 'docentes' },
            ...(periodo ? [{ titulo: `Avance del ${periodo.nombre}`, icono: faCalendarDays, tono: 'crema' as const, actual: habiles(periodo.inicio, hoy < periodo.fin ? hoy : periodo.fin), total: habiles(periodo.inicio, periodo.fin), unidad: 'días hábiles' }] : []),
          ],
          horario: clasesDelColegioHoy(datos),
          proximos: { titulo: 'Alertas', verTodo: `${base}/reportes`, items: alertas.slice(0, 4) },
          lista: { titulo: 'Asistencia por paralelo', verTodo: `${base}/reportes/asistencia`, items: porParalelo },
          perfil: {
            nombre: `${perfil.nombre} ${perfil.primerApellido}`,
            organizacion: espacio.nombre,
            insignia: 'Dirección',
            imagenUrl: perfil.imagenUrl,
            semana,
          },
          actividad: {
            titulo: 'Últimos comunicados',
            verTodo: `${base}/comunicados`,
            items: enviados.slice(0, 4).map((c) => ({
              titulo: c.titulo, detalle: `${c.autorNombre} · leído por ${calculatePercentage(c.alcance.leidos, c.alcance.destinatarios)}%`,
              icono: faBullhorn, tono: c.importante ? 'crema' as const : 'lima' as const, meta: cuando(c.enviado),
            })),
          },
          asistente: { sugerencia: 'Resume la asistencia de esta semana y dime qué paralelos necesitan atención' },
        };
      })
    );
  }

  // ---------- Datos de seguimiento de un estudiante (para él mismo o su padre) ----------
  private seguimiento(espacioId: number, estudianteId: number, paraleloId: number) {
    return forkJoin({
      horario: this.horarios.datos(espacioId),
      registros: this.asistencia.getStudentRecords(estudianteId),
      tareas: this.tareas.tareasDeEstudiante(espacioId, estudianteId),
      estudiantes: this.asistencia.getStudents(),
      datos: paraleloId ? this.calificaciones.getClassGroupData(espacioId, paraleloId) : of(null),
    }).pipe(map((d) => seguimientoDe(d, estudianteId, paraleloId)));
  }
}

// ============================================================================
// Funciones de apoyo
// ============================================================================

interface Seguimiento {
  paraleloId: number;
  curso: string;
  horario: DatosHorario;
  registros: RegistroAsistencia[];
  tareas: TareaDeEstudiante[];
  estudiantes: Estudiante[];
  datos: DatosParalelo | null;
  periodo: string;
  notas: { materia: string; docente: string; icono: IconoMateria; tono: 'lima' | 'azul' | 'crema'; nota: number | null }[];
  promedio: number | null;
  nombreMateria: (id: number) => string;
}

function seguimientoDe(
  d: { horario: DatosHorario; registros: RegistroAsistencia[]; tareas: TareaDeEstudiante[]; estudiantes: Estudiante[]; datos: DatosParalelo | null },
  estudianteId: number,
  paraleloId: number
): Seguimiento {
  const paralelo = d.horario.paralelos.find((p) => p.id === paraleloId);
  const indice = d.datos ? periodoDeFecha(d.datos.gestion, todayIso()) : 0;
  const notas = d.datos
    ? boletinDe(d.datos, indiceNotas(d.datos.notas), estudianteId).map((f) => ({ materia: f.materia.nombre, docente: f.docente, icono: f.materia.icono, tono: f.materia.tono, nota: f.periodos[indice] }))
    : [];
  return {
    ...d,
    paraleloId,
    curso: paralelo ? `${paraleloLabel(paralelo)} · ${NIVELES.find((n) => n.id === paralelo.nivel)?.label}` : 'Sin curso',
    periodo: d.datos?.gestion.periodos[indice]?.nombre ?? '',
    notas,
    promedio: promedio(notas.map((n) => n.nota)),
    nombreMateria: (id) => d.horario.materias.find((m) => m.id === id)?.nombre ?? 'Clase',
  };
}

// Las 3 materias con la nota más baja del periodo (en las que conviene enfocarse)
function tarjetasDeNotas(s: Seguimiento): ResumenData['progreso'] {
  return s.notas
    .filter((n) => n.nota !== null)
    .sort((a, b) => a.nota! - b.nota!)
    .slice(0, 3)
    .map((n) => ({ titulo: n.materia, icono: subjectIcon(n.icono), tono: n.tono, actual: n.nota!, total: s.datos?.config.notaMaxima ?? 100, unidad: `pts · ${s.periodo}` }));
}

function listaDeMaterias(s: Seguimiento, link: string): ResumenData['lista']['items'] {
  return s.notas.map((n) => ({
    titulo: n.materia, subtitulo: `Prof. ${n.docente}`, icono: subjectIcon(n.icono), tono: n.tono,
    meta: n.nota !== null ? `${n.nota} pts` : 'Sin notas', link,
  }));
}

// Tareas por entregar (las vencidas primero) y las últimas revisadas
function novedadesDeTareas(tareas: TareaDeEstudiante[], deHijo: boolean): ItemActividad[] {
  const vencidas = tareas.filter((t) => t.estado === 'no-entregada').map((t) => ({
    titulo: deHijo ? `No entregó: ${t.tarea.titulo}` : `Vencida: ${t.tarea.titulo}`, detalle: `${t.tarea.materia.nombre} · ${formatDueDate(t.tarea)}`,
    icono: faTriangleExclamation, tono: 'crema' as const, meta: 'Tarea',
  }));
  const pendientes = tareas.filter((t) => t.estado === 'pendiente').map((t) => ({
    titulo: t.tarea.titulo, detalle: `${t.tarea.materia.nombre} · ${formatDueDate(t.tarea)}`, icono: faListCheck,
    tono: isDueSoon(t.tarea) ? 'crema' as const : 'lima' as const, meta: 'Por entregar',
  }));
  const revisadas = tareas.filter((t) => t.estado === 'revisada').slice(-1).map((t) => ({
    titulo: `${t.tarea.titulo} · revisada`, detalle: t.entrega?.comentario || t.tarea.materia.nombre, icono: faStar, tono: 'azul' as const,
    meta: t.nota !== null ? `${t.nota}/${t.tarea.notaMaxima}` : 'Revisada',
  }));
  return [...vencidas, ...pendientes, ...revisadas];
}

function sinLeer(recibidos: ComunicadoRecibido[], max = 1): ComunicadoRecibido[] {
  return recibidos.filter((r) => !r.lectura).slice(0, max);
}

function comunicadoComoActividad(r: ComunicadoRecibido): ItemActividad {
  return { titulo: r.comunicado.titulo, detalle: `${r.comunicado.autorNombre} · Comunicado nuevo`, icono: faBullhorn, tono: 'lima', meta: cuando(r.comunicado.enviado) };
}

function agrupar<T>(lista: T[], clave: (x: T) => number): Map<number, T[]> {
  const mapa = new Map<number, T[]>();
  for (const x of lista) mapa.set(clave(x), [...(mapa.get(clave(x)) ?? []), x]);
  return mapa;
}

// Últimos 5 días hábiles (terminando hoy)
function ultimosDiasHabiles(): string[] {
  const fechas: string[] = [];
  for (let f = todayIso(); fechas.length < 5; f = addDays(f, -1)) if (dayOfWeek(f) <= 5) fechas.unshift(f);
  return fechas;
}
const ETIQUETAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi'];

// Semana de asistencia de un estudiante a partir de su resumen diario
function semanaDeAsistencia(registros: RegistroAsistencia[], texto: string): Semana {
  const hoy = todayIso();
  const dias: DiaSemana[] = ultimosDiasHabiles().map((fecha) => {
    const etiqueta = ETIQUETAS[dayOfWeek(fecha) - 1];
    const estado = getDailyStatus(registros.filter((r) => r.fecha === fecha));
    if (!estado) return { etiqueta, estado: fecha === hoy ? 'hoy' : 'pendiente' };
    return { etiqueta, estado: estado === 'presente' ? 'ok' : estado === 'atraso' ? 'atraso' : estado === 'licencia' ? 'pendiente' : 'falta' };
  });
  return { valor: dias.filter((d) => d.estado === 'ok' || d.estado === 'atraso').length, texto, dias };
}

// Últimos 5 días hábiles del docente según sus marcaciones de entrada
function semanaDeMarcaciones(marcaciones: Marcacion[], teniaClases: (fecha: string) => boolean): Semana {
  const hoy = todayIso();
  const dias: DiaSemana[] = ultimosDiasHabiles().map((fecha) => {
    const entrada = marcaciones.find((m) => m.fecha === fecha && m.tipo === 'entrada');
    const etiqueta = ETIQUETAS[dayOfWeek(fecha) - 1];
    if (entrada) return { etiqueta, estado: entrada.estado === 'atraso' ? 'atraso' : 'ok' };
    if (fecha === hoy) return { etiqueta, estado: 'hoy' };
    return { etiqueta, estado: teniaClases(fecha) ? 'falta' : 'pendiente' };
  });
  return { valor: dias.filter((d) => d.estado === 'ok').length, texto: 'días a tiempo en la última semana', dias };
}

// Puntualidad del personal en los últimos 5 días hábiles
function semanaDelPersonal(marcaciones: Marcacion[], esperados: (fecha: string) => number[]): Semana {
  const hoy = todayIso();
  let aTiempo = 0;
  let total = 0;
  const dias: DiaSemana[] = ultimosDiasHabiles().map((fecha) => {
    const etiqueta = ETIQUETAS[dayOfWeek(fecha) - 1];
    if (fecha === hoy) return { etiqueta, estado: 'hoy' };
    const ids = esperados(fecha);
    if (!ids.length) return { etiqueta, estado: 'pendiente' };
    const entradas = ids.map((id) => marcaciones.find((m) => m.fecha === fecha && m.tipo === 'entrada' && m.docenteId === id));
    total += ids.length;
    aTiempo += entradas.filter((e) => e && e.estado !== 'atraso').length;
    if (entradas.some((e) => !e)) return { etiqueta, estado: 'falta' };
    return { etiqueta, estado: entradas.some((e) => e!.estado === 'atraso') ? 'atraso' : 'ok' };
  });
  return { valor: calculatePercentage(aTiempo, total), texto: '% de puntualidad del personal esta semana', dias };
}

// Clases de hoy como eventos de la línea de tiempo del resumen
function horarioDeHoy(datos: DatosHorario, clases: DatosHorario['clases'], modo: 'docente' | 'paralelo', titulo: string): ResumenData['horario'] {
  const hoy = dayOfWeek(todayIso());
  const eventos: EventoHorario[] = itemsDeClases(datos, clases.filter((c) => c.dia === hoy), modo)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((item) => ({
      titulo: modo === 'docente' ? `${item.titulo} · ${item.detalle[0]}` : item.titulo,
      detalle: modo === 'docente' ? item.detalle[1] : `${item.detalle[1]} · ${item.detalle[0]}`,
      inicio: item.inicio,
      fin: item.fin,
      icono: subjectIcon(item.icono),
      tono: item.tono,
    }));
  return conRango(titulo, eventos);
}

// Todas las clases del colegio de hoy (dirección): materia · curso, docente · aula
function clasesDelColegioHoy(datos: DatosHorario): ResumenData['horario'] {
  const hoy = dayOfWeek(todayIso());
  const curso = new Map(datos.paralelos.map((p) => [p.id, paraleloLabel(p)]));
  const eventos: EventoHorario[] = itemsDeClases(datos, datos.clases.filter((c) => c.dia === hoy), 'paralelo')
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || (curso.get(a.paraleloId) ?? '').localeCompare(curso.get(b.paraleloId) ?? ''))
    .map((item) => ({
      titulo: `${item.titulo} · ${curso.get(item.paraleloId) ?? ''}`,
      detalle: `${item.detalle[0]} · ${item.detalle[1]}`,
      inicio: item.inicio,
      fin: item.fin,
      icono: subjectIcon(item.icono),
      tono: item.tono,
    }));
  return conRango('Clases de hoy en el colegio', eventos);
}

function conRango(titulo: string, eventos: EventoHorario[]): ResumenData['horario'] {
  if (!eventos.length) return { titulo, desde: '07:00', hasta: '14:00', eventos };
  const desde = Math.max(0, toMinutes(eventos[0].inicio) - 30);
  const hasta = Math.min(24 * 60 - 1, Math.max(...eventos.map((e) => toMinutes(e.fin))) + 30);
  return { titulo, desde: toTime(desde - (desde % 30)), hasta: toTime(hasta + ((30 - (hasta % 30)) % 30)), eventos };
}

// Clases que quedan hoy (o todas las de hoy si ya terminaron), con los estudiantes del curso como participantes
function proximasDeHoy(datos: DatosHorario, clases: DatosHorario['clases'], modo: 'docente' | 'paralelo', estudiantes: Estudiante[]): ItemProximo[] {
  const ahora = new Date();
  const hoy = dayOfWeek(todayIso());
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const deHoy = itemsDeClases(datos, clases.filter((c) => c.dia === hoy), modo).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const pendientes = deHoy.filter((i) => toMinutes(i.fin) > minutos);
  return (pendientes.length ? pendientes : deHoy).slice(0, 3).map((item) => {
    const alumnos = estudiantes.filter((e) => e.paraleloId === item.paraleloId);
    return {
      titulo: modo === 'docente' ? `${item.titulo} · ${item.detalle[0]}` : item.titulo,
      icono: subjectIcon(item.icono),
      horario: `${item.inicio} – ${item.fin}`,
      detalle: item.detalle[1], // aula
      participantes: alumnos.map((e) => e.nombre),
      totalParticipantes: alumnos.length,
    };
  });
}

function conAccionEnLaPrimera(items: ItemProximo[], accion: NonNullable<ItemProximo['accion']>): ItemProximo[] {
  return items.map((item, i) => (i === 0 ? { ...item, accion } : item));
}
