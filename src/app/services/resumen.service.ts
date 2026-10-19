import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  faAtom,
  faBolt,
  faBookOpen,
  faBullhorn,
  faCalculator,
  faCalendarDays,
  faChartLine,
  faCheck,
  faClipboardCheck,
  faClock,
  faCode,
  faCompass,
  faDoorOpen,
  faFileSignature,
  faFire,
  faFlag,
  faFlask,
  faLink,
  faListCheck,
  faPalette,
  faPeopleGroup,
  faPersonRunning,
  faPlus,
  faQrcode,
  faSitemap,
  faStar,
  faTriangleExclamation,
  faTrophy,
  faUserCheck,
  faUserGraduate,
  faUserPlus,
  faUserXmark,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { Membresia } from '../core/models/espacio.model';
import { aMinutos, aHora } from '../core/utils/jornada';
import { DatosHorario, clasesDeDocente, itemsDeClases } from '../core/utils/horario';
import { iconoMateria } from '../shared/ui/iconos-academicos';
import { CursoDto } from '../models/CursoDto';
import { InscripcionResponseDto } from '../models/inscripcionDto';
import { PerfilDto } from '../models/PerfilDto';
import { DiaSemana, EventoHorario, ItemProximo, ResumenData, Tono } from '../shared/dashboard/dashboard.models';
import { Marcacion } from '../core/models/marcacion.model';
import { diaDeSemana, hoyIso, sumarDias } from '../core/utils/asistencia';
import { AcademicoService } from './academico.service';
import { CourseService } from './course.service';
import { HorariosService } from './horarios.service';
import { MarcacionService } from './marcacion.service';
import { InscripcionService } from './inscripcion.service';
import { ProfileService } from './profile.service';

// MOCK: estudiantes de ejemplo para los avatares
const ESTUDIANTES = ['Luis Mamani', 'Carla Gutiérrez', 'Pedro Choque', 'Ana Rojas', 'Jorge Vargas'];
const DOCENTES = ['Jorge Vargas', 'Carlos Lima', 'Ana Rojas', 'Sofía Paredes'];
const TONOS: Tono[] = ['lima', 'azul', 'crema'];

// Arma los datos del Resumen según el rol y el tipo de espacio.
// Los widgets son los mismos para todos; aquí es donde cambia el contenido.
@Injectable({ providedIn: 'root' })
export class ResumenService {
  private profileService = inject(ProfileService);
  private courseService = inject(CourseService);
  private inscripcionService = inject(InscripcionService);
  private horarios = inject(HorariosService);
  private academico = inject(AcademicoService);
  private marcacion = inject(MarcacionService);

  obtener(membresia: Membresia, usuarioId: number): Observable<ResumenData> {
    const perfil$ = this.profileService.getProfile(usuarioId);

    if (membresia.rol === 'docente' && membresia.espacio.tipo === 'colegio') {
      return forkJoin([perfil$, this.horarios.datos(membresia.espacio.id), this.marcacion.marcacionesDe(usuarioId)]).pipe(
        map(([perfil, datos, marcaciones]) => {
          const clases = clasesDeDocente(datos, usuarioId);
          const semana = semanaDeMarcaciones(marcaciones, (fecha) => !!this.marcacion.esperado(membresia.espacio.id, usuarioId, fecha));
          return this.docenteColegio(membresia, perfil, horarioDeHoy(datos, clases, 'docente', 'Mi horario de hoy'), proximasDeHoy(datos, clases, 'docente'), semana);
        })
      );
    }
    if (membresia.rol === 'docente') {
      return forkJoin([perfil$, this.courseService.getCursosByUsuario(usuarioId)]).pipe(
        map(([perfil, cursos]) => this.docenteAcademia(membresia, perfil, cursos))
      );
    }
    if (membresia.rol === 'estudiante' && membresia.espacio.tipo === 'colegio') {
      return forkJoin([perfil$, this.horarios.datos(membresia.espacio.id), this.academico.paraleloDeEstudiante(usuarioId)]).pipe(
        map(([perfil, datos, paraleloId]) =>
          this.estudianteColegio(
            membresia,
            perfil,
            horarioDeHoy(datos, datos.clases.filter((c) => c.paraleloId === paraleloId), 'paralelo', 'Mi horario de hoy'),
            proximasDeHoy(datos, datos.clases.filter((c) => c.paraleloId === paraleloId), 'paralelo')
          )
        )
      );
    }
    if (membresia.rol === 'estudiante') {
      return forkJoin([perfil$, this.inscripcionService.getInscripcionesByUsuarioId(usuarioId)]).pipe(
        map(([perfil, inscripciones]) => this.estudianteAcademia(membresia, perfil, inscripciones))
      );
    }
    if (membresia.rol === 'direccion') {
      const espacioId = membresia.espacio.id;
      return forkJoin([perfil$, this.marcacion.marcacionesEntre(espacioId, sumarDias(hoyIso(), -14), hoyIso())]).pipe(
        map(([perfil, marcaciones]) => {
          let fecha = hoyIso();
          for (let i = 0; i < 14 && !this.marcacion.docentesEsperados(espacioId, fecha).length; i++) fecha = sumarDias(fecha, -1);
          const esperados = this.marcacion.docentesEsperados(espacioId, fecha).map((e) => e.docenteId);
          const marcaron = new Set(marcaciones.filter((m) => m.fecha === fecha && m.tipo === 'entrada').map((m) => m.docenteId));
          return this.direccion(membresia, perfil, { marcaron: esperados.filter((id) => marcaron.has(id)).length, esperados: esperados.length });
        })
      );
    }
    if (membresia.rol === 'padre') {
      return this.academico.hijosDe(usuarioId).pipe(
        switchMap(([hijoId]) => {
          if (!hijoId) return throwError(() => new Error('No hay estudiantes a cargo de este usuario.'));
          return forkJoin([perfil$, this.profileService.getProfile(hijoId), this.horarios.datos(membresia.espacio.id), this.academico.paraleloDeEstudiante(hijoId)]);
        }),
        map(([perfil, hijo, datos, paraleloId]) =>
          this.padre(membresia, perfil, hijo, horarioDeHoy(datos, datos.clases.filter((c) => c.paraleloId === paraleloId), 'paralelo', `Horario de ${hijo.nombre} hoy`))
        )
      );
    }
    return throwError(() => new Error(`Resumen no disponible para el rol ${membresia.rol}`));
  }

  // MOCK: docente en un colegio (clases = materia + paralelo)
  private docenteColegio({ espacio }: Membresia, perfil: PerfilDto, horario: ResumenData['horario'], proximas: ItemProximo[], semana: ResumenData['perfil']['semana']): ResumenData {
    const base = `/${espacio.slug}/docente`;
    return {
      saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
      subtitulo: `Esto es lo que tienes hoy en ${espacio.nombre}.`,
      accion: { label: 'Marcar entrada', icono: faQrcode, link: `${base}/marcacion` },
      progreso: [
        { titulo: 'Matemáticas · 3ro A', icono: faCalculator, tono: 'lima', actual: 18, total: 28, unidad: 'temas' },
        { titulo: 'Física · 4to B', icono: faAtom, tono: 'azul', actual: 15, total: 28, unidad: 'temas' },
        { titulo: 'Química · 5to A', icono: faFlask, tono: 'crema', actual: 20, total: 26, unidad: 'temas' },
      ],
      horario,
      proximos: {
        titulo: 'Próximas clases',
        verTodo: `${base}/horario`,
        items: conAccionEnLaPrimera(proximas, { label: 'Tomar asistencia', icono: faUserCheck, link: `${base}/asistencia` }),
      },
      lista: {
        titulo: 'Mis clases',
        verTodo: `${base}/clases`,
        items: [
          { titulo: 'Matemáticas · 3ro A', subtitulo: 'Secundaria · Aula 12', icono: faCalculator, tono: 'lima', meta: '32 est.', link: `${base}/clases` },
          { titulo: 'Matemáticas · 3ro B', subtitulo: 'Secundaria · Aula 14', icono: faCalculator, tono: 'lima', meta: '30 est.', link: `${base}/clases` },
          { titulo: 'Física · 4to B', subtitulo: 'Secundaria · Lab. física', icono: faAtom, tono: 'azul', meta: '28 est.', link: `${base}/clases` },
          { titulo: 'Química · 5to A', subtitulo: 'Secundaria · Lab. química', icono: faFlask, tono: 'crema', meta: '25 est.', link: `${base}/clases` },
        ],
      },
      perfil: {
        nombre: `${perfil.nombre} ${perfil.primerApellido}`,
        organizacion: espacio.nombre,
        insignia: 'Docente',
        imagenUrl: perfil.imagenUrl,
        semana,
      },
      actividad: {
        titulo: 'Actividad reciente',
        items: [
          { titulo: 'Asistencia registrada', detalle: '3ro A · 31 de 32 presentes', icono: faUserCheck, tono: 'lima', meta: 'Hoy' },
          { titulo: 'Notas publicadas', detalle: 'Física 4to B · Práctica 3', icono: faStar, tono: 'azul', meta: 'Ayer' },
          { titulo: 'Tema agregado', detalle: 'Química 5to A · Enlaces químicos', icono: faBookOpen, tono: 'crema', meta: 'Lun' },
        ],
      },
      asistente: { sugerencia: 'Genera un quiz de 10 preguntas sobre ecuaciones de segundo grado para 3ro A' },
    };
  }

  // MOCK: docente independiente en su academia (cursos + sesiones en vivo)
  private docenteAcademia({ espacio }: Membresia, perfil: PerfilDto, cursos: CursoDto[]): ResumenData {
    const base = `/${espacio.slug}/docente`;
    const icono = (curso: CursoDto) => (curso.categoriaId === 2 ? faPalette : faCode);
    const avance = [[12, 18], [9, 15], [14, 20], [6, 10]];

    return {
      saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
      subtitulo: `Así van tus cursos en ${espacio.nombre}.`,
      accion: { label: 'Crear curso', icono: faPlus, link: `${base}/contenido/cursos/nuevo` },
      progreso: cursos.slice(0, 3).map((curso, i) => ({
        titulo: curso.nombre,
        icono: icono(curso),
        tono: TONOS[i % TONOS.length],
        actual: avance[i][0],
        total: avance[i][1],
        unidad: 'al día',
      })),
      horario: {
        titulo: 'Sesiones de hoy',
        desde: '09:00',
        hasta: '20:00',
        eventos: [
          { titulo: 'En vivo · Angular desde cero', detalle: 'Google Meet', inicio: '10:00', fin: '11:30', icono: faVideo, tono: 'lima' },
          { titulo: 'Tutoría · Spring Boot', detalle: 'Zoom', inicio: '15:00', fin: '16:00', icono: faVideo, tono: 'azul' },
          { titulo: 'Preguntas · UI/UX', detalle: 'Google Meet', inicio: '18:00', fin: '19:00', icono: faVideo, tono: 'crema' },
        ],
      },
      proximos: {
        titulo: 'Próximas sesiones',
        verTodo: `${base}/sesiones`,
        items: [
          {
            titulo: 'En vivo · Angular desde cero', icono: faVideo, horario: '10:00 – 11:30', detalle: 'Google Meet',
            participantes: ESTUDIANTES, totalParticipantes: 18,
            accion: { label: 'Iniciar sesión', icono: faVideo, link: `${base}/sesiones` },
          },
          { titulo: 'Tutoría · Spring Boot', icono: faVideo, horario: '15:00 – 16:00', detalle: 'Zoom', participantes: ESTUDIANTES.slice(1), totalParticipantes: 6 },
          { titulo: 'Preguntas · UI/UX', icono: faVideo, horario: '18:00 – 19:00', detalle: 'Google Meet', participantes: ESTUDIANTES.slice(2), totalParticipantes: 11 },
        ],
      },
      lista: {
        titulo: 'Mis cursos',
        verTodo: `${base}/contenido/cursos`,
        items: cursos.map((curso, i) => ({
          titulo: curso.nombre,
          subtitulo: `Nivel ${curso.dificultad.toLowerCase()}`,
          icono: icono(curso),
          tono: TONOS[i % TONOS.length],
          meta: `${avance[i % avance.length][1]} est.`,
          link: `${base}/contenido/cursos/${curso.idCurso}`,
        })),
      },
      perfil: {
        nombre: `${perfil.nombre} ${perfil.primerApellido}`,
        organizacion: espacio.nombre,
        insignia: 'Docente',
        imagenUrl: perfil.imagenUrl,
        semana: {
          valor: 4,
          texto: 'días seguidos de actividad',
          dias: [
            { etiqueta: 'Lu', estado: 'ok' },
            { etiqueta: 'Ma', estado: 'ok' },
            { etiqueta: 'Mi', estado: 'ok' },
            { etiqueta: 'Ju', estado: 'ok' },
            { etiqueta: 'Vi', estado: 'hoy' },
            { etiqueta: 'Sá', estado: 'pendiente' },
            { etiqueta: 'Do', estado: 'pendiente' },
          ],
        },
      },
      actividad: {
        titulo: 'Actividad reciente',
        items: [
          { titulo: 'Nuevo estudiante', detalle: 'Carla Gutiérrez · Angular desde cero', icono: faUserPlus, tono: 'lima', meta: 'Hoy' },
          { titulo: 'Link de invitación usado', detalle: '3 inscritos · Java y Spring Boot', icono: faLink, tono: 'azul', meta: 'Ayer' },
          { titulo: 'Evaluación calificada', detalle: 'Fundamentos de UI/UX · Quiz 2', icono: faStar, tono: 'crema', meta: 'Lun' },
        ],
      },
      asistente: { sugerencia: 'Crea un plan de 4 sesiones en vivo para el curso Angular desde cero' },
    };
  }

  // MOCK: estudiante de 3ro A en un colegio (materias, asistencia, notas)
  private estudianteColegio({ espacio }: Membresia, perfil: PerfilDto, horario: ResumenData['horario'], proximas: ItemProximo[]): ResumenData {
    const base = `/${espacio.slug}/estudiante`;
    const companeros = ESTUDIANTES.filter((n) => !n.startsWith(perfil.nombre));
    return {
      saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
      subtitulo: `Esto es lo que tienes hoy en ${espacio.nombre}.`,
      accion: { label: 'Mis tareas (3)', icono: faListCheck, link: `${base}/tareas` },
      progreso: [
        { titulo: 'Matemáticas', icono: faCalculator, tono: 'lima', actual: 16, total: 20, unidad: 'lecciones' },
        { titulo: 'Física', icono: faAtom, tono: 'azul', actual: 11, total: 18, unidad: 'lecciones' },
        { titulo: 'Lenguaje', icono: faBookOpen, tono: 'crema', actual: 19, total: 25, unidad: 'lecciones' },
      ],
      horario,
      proximos: {
        titulo: 'Próximas clases',
        verTodo: `${base}/horario`,
        items: conAccionEnLaPrimera(proximas, { label: 'Ver material', icono: faBookOpen, link: `${base}/cursos` }),
      },
      lista: {
        titulo: 'Mis materias',
        verTodo: `${base}/cursos`,
        items: [
          { titulo: 'Matemáticas', subtitulo: 'Prof. María Fernández', icono: faCalculator, tono: 'lima', meta: '85 pts', link: `${base}/calificaciones` },
          { titulo: 'Física', subtitulo: 'Prof. María Fernández', icono: faAtom, tono: 'azul', meta: '72 pts', link: `${base}/calificaciones` },
          { titulo: 'Lenguaje', subtitulo: 'Prof. Jorge Vargas', icono: faBookOpen, tono: 'crema', meta: '90 pts', link: `${base}/calificaciones` },
          { titulo: 'Educación Física', subtitulo: 'Prof. Ana Rojas', icono: faPersonRunning, tono: 'azul', meta: '95 pts', link: `${base}/calificaciones` },
        ],
      },
      perfil: {
        nombre: `${perfil.nombre} ${perfil.primerApellido}`,
        organizacion: '3ro A · Secundaria',
        insignia: 'Puesto 3',
        imagenUrl: perfil.imagenUrl,
        semana: {
          valor: 4,
          texto: 'días asistidos esta semana',
          dias: [
            { etiqueta: 'Lu', estado: 'ok' },
            { etiqueta: 'Ma', estado: 'ok' },
            { etiqueta: 'Mi', estado: 'atraso' },
            { etiqueta: 'Ju', estado: 'ok' },
            { etiqueta: 'Vi', estado: 'hoy' },
          ],
        },
      },
      actividad: {
        titulo: 'Notas y logros recientes',
        items: [
          { titulo: 'Práctica calificada', detalle: 'Matemáticas · Práctica 3', icono: faStar, tono: 'lima', meta: '85/100' },
          { titulo: 'Tarea entregada', detalle: 'Lenguaje · Ensayo argumentativo', icono: faListCheck, tono: 'crema', meta: 'Hoy' },
          { titulo: 'Asistencia perfecta', detalle: 'Toda la semana pasada', icono: faTrophy, tono: 'azul', meta: '+1' },
        ],
      },
      asistente: { sugerencia: 'Explícame las ecuaciones de segundo grado con ejemplos sencillos' },
    };
  }

  // MOCK: estudiante inscrito en cursos de una academia
  private estudianteAcademia({ espacio }: Membresia, perfil: PerfilDto, inscripciones: InscripcionResponseDto[]): ResumenData {
    const base = `/${espacio.slug}/estudiante`;
    const avance = [[13, 20], [9, 12], [4, 15]];
    const sesiones = [
      { horario: '10:00 – 11:30', inicio: '10:00', fin: '11:30', lugar: 'Google Meet', inscritos: 18 },
      { horario: '18:00 – 19:00', inicio: '18:00', fin: '19:00', lugar: 'Zoom', inscritos: 11 },
      { horario: '15:00 – 16:00', inicio: '15:00', fin: '16:00', lugar: 'Google Meet', inscritos: 6 },
    ];
    const icono = (nombre: string) => (/ui|ux|figma|diseño/i.test(nombre) ? faPalette : faCode);
    const cursos = inscripciones.slice(0, 3);

    return {
      saludo: `¡Hola de nuevo, ${perfil.nombre}!`,
      subtitulo: 'Sigue con tus cursos y alcanza todo tu potencial.',
      accion: { label: 'Explorar cursos', icono: faCompass, link: `${base}/catalogo` },
      progreso: cursos.map((ins, i) => ({
        titulo: ins.cursoNombre,
        icono: icono(ins.cursoNombre),
        tono: TONOS[i % TONOS.length],
        actual: avance[i][0],
        total: avance[i][1],
        unidad: 'lecciones',
      })),
      horario: {
        titulo: 'Sesiones de hoy',
        desde: '09:00',
        hasta: '20:00',
        eventos: cursos.map((ins, i) => ({
          titulo: `En vivo · ${ins.cursoNombre}`,
          detalle: sesiones[i].lugar,
          inicio: sesiones[i].inicio,
          fin: sesiones[i].fin,
          icono: faVideo,
          tono: TONOS[i % TONOS.length],
        })),
      },
      proximos: {
        titulo: 'Próximas sesiones',
        verTodo: `${base}/horario`,
        items: cursos.map((ins, i) => ({
          titulo: `En vivo · ${ins.cursoNombre}`,
          icono: faVideo,
          horario: sesiones[i].horario,
          detalle: sesiones[i].lugar,
          participantes: ESTUDIANTES.slice(i + 1),
          totalParticipantes: sesiones[i].inscritos,
          accion: i === 0 ? { label: 'Unirme', icono: faVideo, link: `${base}/cursos/${ins.cursoId}` } : undefined,
        })),
      },
      lista: {
        titulo: 'Mis cursos',
        verTodo: `${base}/cursos`,
        items: inscripciones.map((ins, i) => {
          const [actual, total] = avance[i % avance.length];
          return {
            titulo: ins.cursoNombre,
            subtitulo: `${actual} de ${total} lecciones`,
            icono: icono(ins.cursoNombre),
            tono: TONOS[i % TONOS.length],
            meta: `${Math.round((actual / total) * 100)}%`,
            link: `${base}/cursos/${ins.cursoId}`,
          };
        }),
      },
      perfil: {
        nombre: `${perfil.nombre} ${perfil.primerApellido}`,
        organizacion: espacio.nombre,
        insignia: '1.250 XP',
        imagenUrl: perfil.imagenUrl,
        semana: {
          valor: 6,
          texto: 'días seguidos estudiando',
          dias: [
            { etiqueta: 'Lu', estado: 'ok' },
            { etiqueta: 'Ma', estado: 'ok' },
            { etiqueta: 'Mi', estado: 'ok' },
            { etiqueta: 'Ju', estado: 'ok' },
            { etiqueta: 'Vi', estado: 'hoy' },
            { etiqueta: 'Sá', estado: 'pendiente' },
            { etiqueta: 'Do', estado: 'pendiente' },
          ],
        },
      },
      actividad: {
        titulo: 'Logros recientes',
        items: [
          { titulo: 'Aprendiz veloz', detalle: '5 lecciones completadas', icono: faBolt, tono: 'lima', meta: '+100 XP' },
          { titulo: 'Constante', detalle: '7 días seguidos estudiando', icono: faFire, tono: 'crema', meta: '+200 XP' },
          { titulo: 'Quiz perfecto', detalle: cursos[0]?.cursoNombre ?? 'Tu primer quiz', icono: faTrophy, tono: 'azul', meta: '+150 XP' },
        ],
      },
      asistente: { sugerencia: 'Resúmeme la última lección de mi curso en palabras sencillas' },
    };
  }

  // MOCK: dirección del colegio (indicadores del día, alertas y paralelos)
  private direccion({ espacio }: Membresia, perfil: PerfilDto, personal: { marcaron: number; esperados: number }): ResumenData {
    const base = `/${espacio.slug}/direccion`;
    return {
      saludo: `¡Buen día, ${perfil.nombre}!`,
      subtitulo: `Así está ${espacio.nombre} hoy.`,
      accion: { label: 'Reporte del día', icono: faChartLine, link: `${base}/reportes` },
      progreso: [
        { titulo: 'Asistencia de estudiantes', icono: faUserGraduate, tono: 'lima', actual: 412, total: 450, unidad: 'presentes' },
        { titulo: 'Docentes que marcaron', icono: faQrcode, tono: 'azul', actual: personal.marcaron, total: personal.esperados, unidad: 'docentes' },
        { titulo: 'Avance del 3er trimestre', icono: faCalendarDays, tono: 'crema', actual: 34, total: 60, unidad: 'días' },
      ],
      horario: {
        titulo: 'Actividades de hoy',
        desde: '07:30',
        hasta: '16:30',
        eventos: [
          { titulo: 'Izado de bandera', detalle: 'Patio central', inicio: '07:45', fin: '08:15', icono: faFlag, tono: 'lima' },
          { titulo: 'Reunión de coordinación', detalle: 'Sala de profesores', inicio: '10:00', fin: '11:00', icono: faPeopleGroup, tono: 'azul' },
          { titulo: 'Visita distrital', detalle: 'Dirección', inicio: '11:30', fin: '12:30', icono: faClipboardCheck, tono: 'crema' },
          { titulo: 'Consejo de padres', detalle: 'Salón de actos', inicio: '15:00', fin: '16:00', icono: faPeopleGroup, tono: 'lima' },
        ],
      },
      proximos: {
        titulo: 'Alertas de hoy',
        verTodo: `${base}/asistencia/personal`,
        items: [
          {
            titulo: '4 docentes sin marcar', icono: faTriangleExclamation, horario: 'Entrada 07:30', detalle: 'Tolerancia vencida',
            participantes: DOCENTES, totalParticipantes: 4,
            accion: { label: 'Ver marcaciones', icono: faQrcode, link: `${base}/asistencia/personal` },
          },
          { titulo: '3ro B · 6 ausentes', icono: faUserXmark, horario: 'Primera hora', detalle: 'Matemáticas', participantes: ESTUDIANTES, totalParticipantes: 6 },
          { titulo: 'Aula 14 sin docente', icono: faDoorOpen, horario: '11:30 – 12:15', detalle: 'Reemplazo pendiente', participantes: DOCENTES.slice(2), totalParticipantes: 1 },
        ],
      },
      lista: {
        titulo: 'Asistencia por paralelo',
        verTodo: `${base}/academico/paralelos`,
        items: [
          { titulo: '3ro A · Secundaria', subtitulo: '31 de 32 presentes · Aula 12', icono: faSitemap, tono: 'lima', meta: '97%', link: `${base}/asistencia/estudiantes` },
          { titulo: '3ro B · Secundaria', subtitulo: '24 de 30 presentes · Aula 14', icono: faSitemap, tono: 'crema', meta: '80%', link: `${base}/asistencia/estudiantes` },
          { titulo: '4to B · Secundaria', subtitulo: '27 de 28 presentes · Aula 16', icono: faSitemap, tono: 'azul', meta: '96%', link: `${base}/asistencia/estudiantes` },
          { titulo: '5to A · Secundaria', subtitulo: '23 de 25 presentes · Aula 18', icono: faSitemap, tono: 'lima', meta: '92%', link: `${base}/asistencia/estudiantes` },
        ],
      },
      perfil: {
        nombre: `${perfil.nombre} ${perfil.primerApellido}`,
        organizacion: espacio.nombre,
        insignia: 'Dirección',
        imagenUrl: perfil.imagenUrl,
        semana: {
          valor: 94,
          texto: '% de asistencia del personal esta semana',
          dias: [
            { etiqueta: 'Lu', estado: 'ok' },
            { etiqueta: 'Ma', estado: 'ok' },
            { etiqueta: 'Mi', estado: 'atraso' },
            { etiqueta: 'Ju', estado: 'ok' },
            { etiqueta: 'Vi', estado: 'hoy' },
          ],
        },
      },
      actividad: {
        titulo: 'Novedades de la institución',
        items: [
          { titulo: 'Notas cerradas', detalle: '1er trimestre · Secundaria', icono: faFileSignature, tono: 'lima', meta: 'Hoy' },
          { titulo: 'Nueva inscripción', detalle: 'Carla Gutiérrez · 3ro A', icono: faUserPlus, tono: 'azul', meta: 'Ayer' },
          { titulo: 'Horario actualizado', detalle: '4to B · Laboratorio de física', icono: faCalendarDays, tono: 'crema', meta: 'Lun' },
        ],
      },
      asistente: { sugerencia: 'Resume la asistencia de esta semana y dime qué paralelos necesitan atención' },
    };
  }

  // MOCK: padre o tutor legal; el resumen gira en torno a su hijo
  private padre({ espacio }: Membresia, perfil: PerfilDto, hijo: PerfilDto, horario: ResumenData['horario']): ResumenData {
    const base = `/${espacio.slug}/padre`;
    return {
      saludo: `¡Hola, ${perfil.nombre}!`,
      subtitulo: `Así le va a ${hijo.nombre} hoy en ${espacio.nombre}.`,
      accion: { label: 'Comunicados (2)', icono: faBullhorn, link: `${base}/comunicados` },
      progreso: [
        { titulo: 'Matemáticas', icono: faCalculator, tono: 'lima', actual: 85, total: 100, unidad: 'pts' },
        { titulo: 'Física', icono: faAtom, tono: 'azul', actual: 72, total: 100, unidad: 'pts' },
        { titulo: 'Lenguaje', icono: faBookOpen, tono: 'crema', actual: 90, total: 100, unidad: 'pts' },
      ],
      horario,
      proximos: {
        titulo: 'Próximos eventos',
        verTodo: `${base}/comunicados`,
        items: [
          {
            titulo: 'Reunión de padres · 3ro A', icono: faPeopleGroup, horario: 'Viernes 18:30', detalle: 'Salón de actos',
            participantes: ESTUDIANTES, totalParticipantes: 32,
            accion: { label: 'Confirmar asistencia', icono: faCheck, link: `${base}/comunicados` },
          },
          { titulo: 'Examen de Matemáticas', icono: faCalculator, horario: 'Lunes 08:00', detalle: 'Aula 12', participantes: ESTUDIANTES.slice(1), totalParticipantes: 32 },
          { titulo: 'Feria de ciencias', icono: faFlask, horario: 'Jueves 10:00', detalle: 'Patio central', participantes: ESTUDIANTES.slice(2), totalParticipantes: 120 },
        ],
      },
      lista: {
        titulo: 'Comunicados',
        verTodo: `${base}/comunicados`,
        items: [
          { titulo: 'Reunión de padres de familia', subtitulo: 'Dirección · Viernes 18:30', icono: faBullhorn, tono: 'lima', meta: 'Nuevo', link: `${base}/comunicados` },
          { titulo: 'Materiales para la feria de ciencias', subtitulo: 'Prof. María Fernández', icono: faFlask, tono: 'azul', meta: 'Nuevo', link: `${base}/comunicados` },
          { titulo: 'Cronograma de exámenes', subtitulo: 'Coordinación académica', icono: faCalendarDays, tono: 'crema', meta: 'Lun', link: `${base}/comunicados` },
        ],
      },
      perfil: {
        nombre: `${hijo.nombre} ${hijo.primerApellido}`,
        organizacion: '3ro A · Secundaria',
        insignia: 'Mi hijo',
        imagenUrl: hijo.imagenUrl,
        semana: {
          valor: 4,
          texto: `días que asistió ${hijo.nombre} esta semana`,
          dias: [
            { etiqueta: 'Lu', estado: 'ok' },
            { etiqueta: 'Ma', estado: 'ok' },
            { etiqueta: 'Mi', estado: 'atraso' },
            { etiqueta: 'Ju', estado: 'ok' },
            { etiqueta: 'Vi', estado: 'hoy' },
          ],
        },
      },
      actividad: {
        titulo: `Novedades de ${hijo.nombre}`,
        items: [
          { titulo: 'Nota publicada', detalle: 'Matemáticas · Práctica 3', icono: faStar, tono: 'lima', meta: '85/100' },
          { titulo: 'Atraso registrado', detalle: 'Miércoles · 10 minutos', icono: faClock, tono: 'crema', meta: 'Mié' },
          { titulo: 'Tarea entregada', detalle: 'Lenguaje · Ensayo argumentativo', icono: faListCheck, tono: 'azul', meta: 'Hoy' },
        ],
      },
      asistente: { sugerencia: `¿Cómo puedo ayudar a ${hijo.nombre} a mejorar en Física?` },
    };
  }
}

// Clases de hoy como eventos de la línea de tiempo del resumen
function horarioDeHoy(datos: DatosHorario, clases: DatosHorario['clases'], modo: 'docente' | 'paralelo', titulo: string): ResumenData['horario'] {
  const hoy = ((new Date().getDay() + 6) % 7) + 1; // 1 = lunes … 7 = domingo
  const eventos: EventoHorario[] = itemsDeClases(datos, clases.filter((c) => c.dia === hoy), modo)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((item) => ({
      titulo: modo === 'docente' ? `${item.titulo} · ${item.detalle[0]}` : item.titulo,
      detalle: modo === 'docente' ? item.detalle[1] : `${item.detalle[1]} · ${item.detalle[0]}`,
      inicio: item.inicio,
      fin: item.fin,
      icono: iconoMateria(item.icono),
      tono: item.tono,
    }));
  if (!eventos.length) return { titulo, desde: '07:00', hasta: '14:00', eventos };
  const desde = Math.max(0, aMinutos(eventos[0].inicio) - 30);
  const hasta = Math.min(24 * 60 - 1, Math.max(...eventos.map((e) => aMinutos(e.fin))) + 30);
  return { titulo, desde: aHora(desde - (desde % 30)), hasta: aHora(hasta + ((30 - (hasta % 30)) % 30)), eventos };
}

// Clases que quedan hoy (o todas las de hoy si ya terminaron), para "Próximas clases"
function proximasDeHoy(datos: DatosHorario, clases: DatosHorario['clases'], modo: 'docente' | 'paralelo'): ItemProximo[] {
  const ahora = new Date();
  const hoy = ((ahora.getDay() + 6) % 7) + 1;
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const deHoy = itemsDeClases(datos, clases.filter((c) => c.dia === hoy), modo).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const pendientes = deHoy.filter((i) => aMinutos(i.fin) > minutos);
  return (pendientes.length ? pendientes : deHoy).slice(0, 3).map((item, i) => {
    const paralelo = datos.paralelos.find((p) => p.id === item.paraleloId);
    return {
      titulo: modo === 'docente' ? `${item.titulo} · ${item.detalle[0]}` : item.titulo,
      icono: iconoMateria(item.icono),
      horario: `${item.inicio} – ${item.fin}`,
      detalle: item.detalle[1], // aula
      participantes: ESTUDIANTES.slice(i % 2),
      totalParticipantes: paralelo?.estudiantes ?? ESTUDIANTES.length,
    };
  });
}

function conAccionEnLaPrimera(items: ItemProximo[], accion: NonNullable<ItemProximo['accion']>): ItemProximo[] {
  return items.map((item, i) => (i === 0 ? { ...item, accion } : item));
}

// Últimos 5 días hábiles del docente según sus marcaciones de entrada
function semanaDeMarcaciones(marcaciones: Marcacion[], teniaClases: (fecha: string) => boolean): ResumenData['perfil']['semana'] {
  const hoy = hoyIso();
  const fechas: string[] = [];
  for (let f = hoy; fechas.length < 5; f = sumarDias(f, -1)) if (diaDeSemana(f) <= 5) fechas.unshift(f);
  const etiquetas = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi'];
  const dias: DiaSemana[] = fechas.map((fecha) => {
    const entrada = marcaciones.find((m) => m.fecha === fecha && m.tipo === 'entrada');
    const etiqueta = etiquetas[diaDeSemana(fecha) - 1];
    if (entrada) return { etiqueta, estado: entrada.estado === 'atraso' ? 'atraso' : 'ok' };
    if (fecha === hoy) return { etiqueta, estado: 'hoy' };
    return { etiqueta, estado: teniaClases(fecha) ? 'falta' : 'pendiente' };
  });
  return { valor: dias.filter((d) => d.estado === 'ok').length, texto: 'días a tiempo en la última semana', dias };
}
