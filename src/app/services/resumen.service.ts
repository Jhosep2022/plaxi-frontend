import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  faAtom,
  faBolt,
  faBookOpen,
  faCalculator,
  faCode,
  faCompass,
  faFire,
  faFlask,
  faLink,
  faListCheck,
  faPalette,
  faPersonRunning,
  faPlus,
  faQrcode,
  faStar,
  faTrophy,
  faUserCheck,
  faUserPlus,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { Membresia } from '../core/models/espacio.model';
import { CursoDto } from '../models/CursoDto';
import { InscripcionResponseDto } from '../models/inscripcionDto';
import { PerfilDto } from '../models/PerfilDto';
import { ResumenData, Tono } from '../shared/dashboard/dashboard.models';
import { CourseService } from './course.service';
import { InscripcionService } from './inscripcion.service';
import { ProfileService } from './profile.service';

// MOCK: estudiantes de ejemplo para los avatares
const ESTUDIANTES = ['Luis Mamani', 'Carla Gutiérrez', 'Pedro Choque', 'Ana Rojas', 'Jorge Vargas'];
const TONOS: Tono[] = ['lima', 'azul', 'crema'];

// Arma los datos del Resumen según el rol y el tipo de espacio.
// Los widgets son los mismos para todos; aquí es donde cambia el contenido.
@Injectable({ providedIn: 'root' })
export class ResumenService {
  private profileService = inject(ProfileService);
  private courseService = inject(CourseService);
  private inscripcionService = inject(InscripcionService);

  obtener(membresia: Membresia, usuarioId: number): Observable<ResumenData> {
    const perfil$ = this.profileService.getProfile(usuarioId);

    if (membresia.rol === 'docente' && membresia.espacio.tipo === 'colegio') {
      return perfil$.pipe(map((perfil) => this.docenteColegio(membresia, perfil)));
    }
    if (membresia.rol === 'docente') {
      return forkJoin([perfil$, this.courseService.getCursosByUsuario(usuarioId)]).pipe(
        map(([perfil, cursos]) => this.docenteAcademia(membresia, perfil, cursos))
      );
    }
    if (membresia.rol === 'estudiante' && membresia.espacio.tipo === 'colegio') {
      return perfil$.pipe(map((perfil) => this.estudianteColegio(membresia, perfil)));
    }
    if (membresia.rol === 'estudiante') {
      return forkJoin([perfil$, this.inscripcionService.getInscripcionesByUsuarioId(usuarioId)]).pipe(
        map(([perfil, inscripciones]) => this.estudianteAcademia(membresia, perfil, inscripciones))
      );
    }
    return throwError(() => new Error(`Resumen no disponible para el rol ${membresia.rol}`));
  }

  // MOCK: docente en un colegio (clases = materia + paralelo)
  private docenteColegio({ espacio }: Membresia, perfil: PerfilDto): ResumenData {
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
      horario: {
        titulo: 'Mi horario de hoy',
        desde: '07:30',
        hasta: '14:30',
        eventos: [
          { titulo: 'Matemáticas · 3ro A', detalle: 'Aula 12', inicio: '08:00', fin: '09:30', icono: faCalculator, tono: 'lima' },
          { titulo: 'Física · 4to B', detalle: 'Laboratorio de física', inicio: '09:45', fin: '11:15', icono: faAtom, tono: 'azul' },
          { titulo: 'Matemáticas · 3ro B', detalle: 'Aula 14', inicio: '11:30', fin: '12:15', icono: faCalculator, tono: 'lima' },
          { titulo: 'Química · 5to A', detalle: 'Laboratorio de química', inicio: '12:30', fin: '14:00', icono: faFlask, tono: 'crema' },
        ],
      },
      proximos: {
        titulo: 'Próximas clases',
        verTodo: `${base}/horario`,
        items: [
          {
            titulo: 'Matemáticas · 3ro A', icono: faCalculator, horario: '08:00 – 09:30', detalle: 'Aula 12',
            participantes: ESTUDIANTES, totalParticipantes: 32,
            accion: { label: 'Tomar asistencia', icono: faUserCheck, link: `${base}/asistencia` },
          },
          { titulo: 'Física · 4to B', icono: faAtom, horario: '09:45 – 11:15', detalle: 'Lab. física', participantes: ESTUDIANTES.slice(1), totalParticipantes: 28 },
          { titulo: 'Química · 5to A', icono: faFlask, horario: '12:30 – 14:00', detalle: 'Lab. química', participantes: ESTUDIANTES.slice(2), totalParticipantes: 25 },
        ],
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
        semana: {
          valor: 3,
          texto: 'días a tiempo esta semana',
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
  private estudianteColegio({ espacio }: Membresia, perfil: PerfilDto): ResumenData {
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
      horario: {
        titulo: 'Mi horario de hoy',
        desde: '07:30',
        hasta: '14:30',
        eventos: [
          { titulo: 'Matemáticas', detalle: 'Aula 12 · Prof. María', inicio: '08:00', fin: '09:30', icono: faCalculator, tono: 'lima' },
          { titulo: 'Lenguaje', detalle: 'Aula 12 · Prof. Jorge', inicio: '09:45', fin: '11:15', icono: faBookOpen, tono: 'crema' },
          { titulo: 'Educación Física', detalle: 'Coliseo', inicio: '11:30', fin: '12:15', icono: faPersonRunning, tono: 'azul' },
          { titulo: 'Física', detalle: 'Laboratorio de física', inicio: '12:30', fin: '14:00', icono: faAtom, tono: 'azul' },
        ],
      },
      proximos: {
        titulo: 'Próximas clases',
        verTodo: `${base}/horario`,
        items: [
          {
            titulo: 'Matemáticas', icono: faCalculator, horario: '08:00 – 09:30', detalle: 'Aula 12',
            participantes: companeros, totalParticipantes: 31,
            accion: { label: 'Ver material', icono: faBookOpen, link: `${base}/cursos` },
          },
          { titulo: 'Lenguaje', icono: faBookOpen, horario: '09:45 – 11:15', detalle: 'Aula 12', participantes: companeros.slice(1), totalParticipantes: 31 },
          { titulo: 'Física', icono: faAtom, horario: '12:30 – 14:00', detalle: 'Lab. física', participantes: companeros.slice(2), totalParticipantes: 31 },
        ],
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
}
