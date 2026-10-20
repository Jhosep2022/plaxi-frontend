import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { faCircleQuestion, faCompass, faFilm, faPlus, faStar, faUserCheck, faVideo } from '@fortawesome/free-solid-svg-icons';
import { Membresia } from '../core/models/espacio.model';
import { diaDeSemana, fechaCorta, hoyIso, sumarDias } from '../core/utils/asistencia';
import { aHora, aMinutos } from '../core/utils/jornada';
import { DiaSemana, EventoHorario, ItemActividad, ItemProximo, ResumenData } from '../shared/dashboard/dashboard.models';
import { iconoMateria } from '../shared/ui/iconos-academicos';
import { AcademiaService } from './academia.service';
import { AulasService } from './aulas.service';
import { ProfileService } from './profile.service';
import { QuizService } from './quiz.service';
import { SesionVista, SesionesService } from './sesiones.service';

const ETIQUETAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi'];

// Resumen (Inicio) de la academia con los mismos datos que usan sus pantallas: cursos, sesiones, quiz y solicitudes
@Injectable({ providedIn: 'root' })
export class ResumenAcademiaService {
  private perfiles = inject(ProfileService);
  private aulas = inject(AulasService);
  private sesiones = inject(SesionesService);
  private academia = inject(AcademiaService);
  private quiz = inject(QuizService);

  obtener(membresia: Membresia, usuarioId: number): Observable<ResumenData> {
    return membresia.rol === 'docente' ? this.docente(membresia, usuarioId) : this.estudiante(membresia, usuarioId);
  }

  private docente({ espacio }: Membresia, usuarioId: number): Observable<ResumenData> {
    const base = `/${espacio.slug}/docente`;
    return forkJoin({
      perfil: this.perfiles.getProfile(usuarioId),
      aulas: this.aulas.aulasDocente(espacio.id, usuarioId),
      sesiones: this.sesiones.sesionesDocente(espacio.id, usuarioId),
      solicitudes: this.academia.solicitudes(espacio.id, usuarioId),
      estudiantes: this.academia.estudiantes(espacio.id, usuarioId),
    }).pipe(
      map(({ perfil, aulas, sesiones, solicitudes, estudiantes }): ResumenData => {
        const cursos = aulas.filter((a) => a.tipo === 'curso');
        const nombres = (aulaId: number) => estudiantes.filter((e) => e.cursos.some((c) => c.aulaId === aulaId)).map((e) => e.nombre);
        const sinGrabacion = sesiones.filter((s) => s.estado === 'finalizada' && !s.grabacion);
        const paraHacer: ItemActividad[] = [
          ...solicitudes.map((s) => ({ titulo: `${s.nombre} quiere unirse`, detalle: s.curso, icono: faUserCheck, tono: 'crema' as const, meta: 'Solicitud' })),
          ...sinGrabacion.slice(0, 2).map((s) => ({ titulo: 'Sube la grabación', detalle: `${s.titulo} · ${s.curso}`, icono: faFilm, tono: 'azul' as const, meta: fechaCorta(s.fecha) })),
          ...cursos.filter((c) => !c.temas).map((c) => ({ titulo: 'Agrega contenido', detalle: `${c.nombre} todavía no tiene temas`, icono: faPlus, tono: 'lima' as const, meta: 'Curso' })),
        ];
        return {
          saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
          subtitulo: `Así van tus cursos en ${espacio.nombre}.`,
          accion: { label: 'Crear curso', icono: faPlus, link: `${base}/cursos/nuevo` },
          progreso: cursos.filter((c) => c.anillos[0].valor !== null).slice(0, 3).map((c) => ({
            titulo: c.nombre, icono: iconoMateria(c.icono), tono: c.tono, actual: c.anillos[0].valor ?? 0, total: 100, unidad: 'de avance del grupo',
          })),
          horario: sesionesDeHoy(sesiones, 'Sesiones de hoy'),
          proximos: {
            titulo: 'Próximas sesiones',
            verTodo: `${base}/sesiones`,
            items: proximas(sesiones).map((s, i): ItemProximo => ({
              titulo: s.titulo, icono: faVideo, horario: `${cuando(s)} · ${s.inicio} – ${s.fin}`, detalle: s.curso,
              participantes: nombres(s.aulaId), totalParticipantes: s.estudiantes,
              accion: i === 0 ? { label: s.estado === 'en-curso' ? 'Iniciar' : 'Ver sesiones', icono: faVideo, link: `${base}/sesiones` } : undefined,
            })),
          },
          lista: {
            titulo: 'Mis cursos',
            verTodo: `${base}/clases`,
            items: cursos.map((c) => ({ titulo: c.nombre, subtitulo: `${c.temas} temas · ${c.quiz} quiz`, icono: iconoMateria(c.icono), tono: c.tono, meta: `${c.estudiantes} est.`, link: `${base}/clases/${c.id}` })),
          },
          perfil: {
            nombre: `${perfil.nombre} ${perfil.primerApellido}`,
            organizacion: espacio.nombre,
            insignia: 'Docente',
            imagenUrl: perfil.imagenUrl,
            semana: semanaDeSesiones(sesiones, () => 'ok', 'sesiones dictadas esta semana'),
          },
          actividad: { titulo: 'Para hacer', verTodo: `${base}/estudiantes/solicitudes`, items: paraHacer.slice(0, 4) },
          asistente: { sugerencia: cursos[0] ? `Propón un quiz de 5 preguntas para repasar ${cursos[0].nombre}` : 'Ayúdame a planificar mi primer curso' },
        };
      })
    );
  }

  private estudiante({ espacio }: Membresia, usuarioId: number): Observable<ResumenData> {
    const base = `/${espacio.slug}/estudiante`;
    return forkJoin({
      perfil: this.perfiles.getProfile(usuarioId),
      aulas: this.aulas.aulasEstudiante(espacio.id, usuarioId),
      sesiones: this.sesiones.sesionesEstudiante(espacio.id, usuarioId),
    }).pipe(
      switchMap((d) => {
        const cursos = d.aulas.filter((a) => a.tipo === 'curso');
        return (cursos.length ? forkJoin(cursos.map((c) => this.quiz.quizzesEstudiante(c.id, usuarioId).pipe(map((qs) => qs.map((q) => ({ ...q, curso: c.nombre })))))) : of([]))
          .pipe(map((porCurso) => ({ ...d, cursos, quizzes: porCurso.flat() })));
      }),
      map(({ perfil, cursos, sesiones, quizzes }): ResumenData => {
        const pendientes = quizzes.filter((q) => q.estado === 'pendiente');
        const novedades: ItemActividad[] = [
          ...pendientes.map((q) => ({ titulo: q.titulo, detalle: `${q.curso} · cierra ${fechaCorta(q.cierre)}`, icono: faCircleQuestion, tono: 'crema' as const, meta: 'Quiz' })),
          ...quizzes.filter((q) => q.mejor).map((q) => ({ titulo: `${q.titulo}: ${Math.round((q.mejor!.puntaje / q.mejor!.puntajeMax) * 100)}%`, detalle: q.curso, icono: faStar, tono: 'lima' as const, meta: 'Resultado' })),
          ...sesiones.filter((s) => s.estado === 'finalizada' && s.grabacion && !s.asisti).map((s) => ({ titulo: 'Grabación disponible', detalle: `${s.titulo} · ${s.curso}`, icono: faFilm, tono: 'azul' as const, meta: fechaCorta(s.fecha) })),
        ];
        return {
          saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
          subtitulo: 'Sigue con tus cursos y alcanza todo tu potencial.',
          accion: { label: 'Explorar cursos', icono: faCompass, link: `${base}/catalogo` },
          progreso: cursos.filter((c) => c.temas > 0).slice(0, 3).map((c) => ({
            titulo: c.nombre, icono: iconoMateria(c.icono), tono: c.tono, actual: Math.round(((c.anillos[0].valor ?? 0) * c.temas) / 100), total: c.temas, unidad: 'temas vistos',
          })),
          horario: sesionesDeHoy(sesiones, 'Sesiones de hoy'),
          proximos: {
            titulo: 'Próximas sesiones',
            verTodo: `${base}/sesiones`,
            items: proximas(sesiones).map((s, i): ItemProximo => ({
              titulo: s.titulo, icono: faVideo, horario: `${cuando(s)} · ${s.inicio} – ${s.fin}`, detalle: s.curso, participantes: [], totalParticipantes: 0,
              accion: i === 0 ? { label: s.estado === 'en-curso' ? 'Unirme' : 'Ver sesiones', icono: faVideo, link: `${base}/sesiones` } : undefined,
            })),
          },
          lista: {
            titulo: 'Mis cursos',
            verTodo: `${base}/aulas`,
            items: cursos.map((c) => ({ titulo: c.nombre, subtitulo: `Prof. ${c.docente}`, icono: iconoMateria(c.icono), tono: c.tono, meta: `${c.anillos[0].valor ?? 0}%`, link: `${base}/aulas/${c.id}` })),
          },
          perfil: {
            nombre: `${perfil.nombre} ${perfil.primerApellido}`,
            organizacion: espacio.nombre,
            insignia: `${cursos.length} ${cursos.length === 1 ? 'curso' : 'cursos'}`,
            imagenUrl: perfil.imagenUrl,
            semana: semanaDeSesiones(sesiones, (s) => (s.asisti ? 'ok' : 'falta'), 'sesiones a las que asististe esta semana'),
          },
          actividad: { titulo: 'Novedades', verTodo: `${base}/calificaciones`, items: novedades.slice(0, 4) },
          asistente: { sugerencia: pendientes[0] ? `Ayúdame a prepararme para el ${pendientes[0].titulo.toLowerCase()}` : 'Resúmeme la última lección de mi curso en palabras sencillas' },
        };
      })
    );
  }
}

// ---------- Apoyo ----------
function cuando(s: SesionVista): string {
  return s.fecha === hoyIso() ? 'Hoy' : s.fecha === sumarDias(hoyIso(), 1) ? 'Mañana' : fechaCorta(s.fecha);
}

function proximas(sesiones: SesionVista[]): SesionVista[] {
  return sesiones.filter((s) => s.estado !== 'finalizada').sort((a, b) => `${a.fecha}${a.inicio}`.localeCompare(`${b.fecha}${b.inicio}`)).slice(0, 3);
}

function sesionesDeHoy(sesiones: SesionVista[], titulo: string): ResumenData['horario'] {
  const eventos: EventoHorario[] = sesiones
    .filter((s) => s.fecha === hoyIso())
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((s, i) => ({ titulo: s.titulo, detalle: s.curso, inicio: s.inicio, fin: s.fin, icono: faVideo, tono: (['lima', 'azul', 'crema'] as const)[i % 3] }));
  if (!eventos.length) return { titulo, desde: '09:00', hasta: '20:00', eventos };
  const desde = Math.max(0, aMinutos(eventos[0].inicio) - 60);
  const hasta = Math.min(24 * 60 - 1, Math.max(...eventos.map((e) => aMinutos(e.fin))) + 60);
  return { titulo, desde: aHora(desde - (desde % 30)), hasta: aHora(hasta + ((30 - (hasta % 30)) % 30)), eventos };
}

// Últimos 5 días hábiles: cada día con sesión se marca según la función (dictada, asistida o faltó)
function semanaDeSesiones(sesiones: SesionVista[], estadoDe: (s: SesionVista) => 'ok' | 'falta', texto: string): ResumenData['perfil']['semana'] {
  const hoy = hoyIso();
  const fechas: string[] = [];
  for (let f = hoy; fechas.length < 5; f = sumarDias(f, -1)) if (diaDeSemana(f) <= 5) fechas.unshift(f);
  const dias: DiaSemana[] = fechas.map((fecha) => {
    const etiqueta = ETIQUETAS[diaDeSemana(fecha) - 1];
    const delDia = sesiones.filter((s) => s.fecha === fecha && s.estado === 'finalizada');
    if (!delDia.length) return { etiqueta, estado: fecha === hoy ? 'hoy' : 'pendiente' };
    return { etiqueta, estado: delDia.some((s) => estadoDe(s) === 'ok') ? 'ok' : 'falta' };
  });
  return { valor: dias.filter((d) => d.estado === 'ok').length, texto, dias };
}
