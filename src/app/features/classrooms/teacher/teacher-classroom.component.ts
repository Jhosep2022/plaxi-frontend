import { Component, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faBookOpen, faCalendarDays, faCamera, faChalkboard, faChartLine, faChevronDown, faCircleQuestion, faClipboardCheck,
  faListCheck, faMagnifyingGlass, faPen, faPlus, faStar, faTrash, faTriangleExclamation, faUserCheck, faUserMinus, faUserPlus, faUsers, faXmark, faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { iniciales } from '../../../core/models/people.model';
import { fechaCorta } from '../../../core/utils/attendance';
import { venceLabel } from '../../../core/utils/assignments';
import { ClassroomsService, PORTADA_MAX_KB } from '../../../services/classrooms.service';
import { ASISTENCIA_MINIMA, TeacherClassesService, EstudianteDeClase } from '../../../services/teacher-classes.service';
import { AssignmentsService } from '../../../services/assignments.service';
import { ClassroomCoverComponent } from '../../../shared/classrooms/classroom-cover.component';
import { NotificationService } from '../../../shared/ui/notification.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { getErrorMessage } from '../../management/academics/academics.ui';
import { TeacherContentComponent } from './teacher-content.component';
import { TeacherQuizComponent } from './teacher-quiz.component';
import { CourseFormComponent } from './course-form.component';
import { CourseInvitationComponent } from './course-invitation.component';
import { AcademyService, Solicitud } from '../../../services/academy.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';

export type PestanaAula = 'inicio' | 'contenido' | 'quiz' | 'tareas' | 'estudiantes' | 'notas';

// Aula virtual del docente: inicio, contenido, quiz, tareas, estudiantes y notas de una clase o curso
@Component({
  selector: 'app-teacher-classroom',
  host: { class: 'ui-pagina', '(document:click)': 'menuNuevo.set(false)' },
  imports: [FaIconComponent, RouterLink, EmptyStateComponent, ClassroomCoverComponent, TeacherContentComponent, TeacherQuizComponent, CourseFormComponent, CourseInvitationComponent, DrawerComponent],
  templateUrl: './teacher-classroom.component.html',
  styleUrls: ['./teacher-classroom.component.css'],
})
export class TeacherClassroomComponent {
  private session = inject(SessionService);
  private router = inject(Router);
  private aulas = inject(ClassroomsService);
  private clasesDocente = inject(TeacherClassesService);
  private tareasService = inject(AssignmentsService);
  private avisos = inject(NotificationService);
  private academia = inject(AcademyService);

  readonly asignacionId = input.required<string>(); // id del aula (en el colegio coincide con la asignación)
  readonly tab = input<string>(); // ?tab=contenido

  readonly ASISTENCIA_MINIMA = ASISTENCIA_MINIMA;
  readonly iniciales = iniciales;
  readonly fechaCorta = fechaCorta;
  readonly venceLabel = venceLabel;
  readonly faArrowLeft = faArrowLeft;
  readonly faBookOpen = faBookOpen;
  readonly faCalendarDays = faCalendarDays;
  readonly faCamera = faCamera;
  readonly faChalkboard = faChalkboard;
  readonly faChartLine = faChartLine;
  readonly faChevronDown = faChevronDown;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faClipboardCheck = faClipboardCheck;
  readonly faListCheck = faListCheck;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPlus = faPlus;
  readonly faStar = faStar;
  readonly faTrash = faTrash;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faUserCheck = faUserCheck;
  readonly faUsers = faUsers;
  readonly faPen = faPen;
  readonly faUserMinus = faUserMinus;
  readonly faUserPlus = faUserPlus;
  readonly faXmark = faXmark;
  readonly faCheck = faCheck;

  private readonly espacio = this.session.espacioActivo()!;
  private readonly docenteId = this.session.usuarioId()!;
  private readonly id = computed(() => Number(this.asignacionId()));

  readonly aula = rxResource({ params: () => this.id(), stream: ({ params }) => this.aulas.aula(params) });
  readonly esMia = computed(() => this.aula.value()?.docenteId === this.docenteId);

  // Seguimiento de la clase (solo colegio): asistencia, notas y pendientes por estudiante
  readonly clase = rxResource({
    params: () => this.aula.value(),
    stream: ({ params }) =>
      params?.tipo === 'clase' ? this.clasesDocente.clasesDe(this.espacio.id, this.docenteId) : of([]),
    defaultValue: [],
  });
  readonly seguimiento = computed(() => this.clase.value().find((c) => c.asignacion.id === this.id()) ?? null);

  readonly extra = rxResource({
    params: () => this.id(),
    stream: ({ params }) => forkJoin({ progreso: this.aulas.progresoGrupo(params), tareas: this.tareasService.tareasDocente(this.espacio.id, this.docenteId) }),
  });
  readonly tareas = computed(() => {
    const a = this.aula.value();
    return (this.extra.value()?.tareas ?? []).filter((t) => t.aulaId === a?.id);
  });

  // Promedio del avance de los estudiantes en el contenido publicado
  readonly avanceGrupo = computed(() => {
    const p = this.extra.value()?.progreso ?? [];
    return p.length ? Math.round(p.reduce((s, x) => s + x.porcentaje, 0) / p.length) : 0;
  });
  readonly tieneRevisiones = computed(() => this.tareas().some((t) => t.porRevisar > 0) || (this.seguimiento()?.pendientes.length ?? 0) > 0);

  readonly pestana = linkedSignal<PestanaAula>(() => (['inicio', 'contenido', 'quiz', 'tareas', 'estudiantes', 'notas'].includes(this.tab() ?? '') ? (this.tab() as PestanaAula) : 'inicio'));

  ruta(...segmentos: (string | number)[]) {
    return this.session.rutaRol(...segmentos);
  }

  // ---------- "+ Nuevo" ----------
  readonly menuNuevo = signal(false);
  private readonly contenido = viewChild(TeacherContentComponent);

  alternarMenu(event: Event): void {
    event.stopPropagation();
    this.menuNuevo.update((v) => !v);
  }

  nuevo(tipo: 'unidad' | 'tema' | 'tarea' | 'quiz'): void {
    this.menuNuevo.set(false);
    const a = this.aula.value();
    if (tipo === 'quiz') {
      this.router.navigate(this.ruta('clases', this.id(), 'quiz', 'nuevo'));
      return;
    }
    if (tipo === 'tarea') {
      this.router.navigate(this.ruta('tareas'), { queryParams: a ? { clase: a.id } : {} });
      return;
    }
    this.pestana.set('contenido');
    // Espera a que se muestre el editor de contenido para abrir su formulario
    setTimeout(() => (tipo === 'unidad' ? this.contenido()?.nuevaUnidad() : this.contenido()?.nuevoTema()));
  }

  // ---------- Portada ----------
  async elegirPortada(event: Event): Promise<void> {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return this.avisos.error('La portada debe ser una imagen.');
    if (archivo.size > PORTADA_MAX_KB * 1024) return this.avisos.error(`La imagen debe pesar menos de ${PORTADA_MAX_KB} KB.`);
    const lector = new FileReader();
    lector.onload = () => this.guardarPortada(String(lector.result), 'Portada actualizada.');
    lector.readAsDataURL(archivo);
  }

  async guardarPortada(portada: string, mensaje: string): Promise<void> {
    try {
      await firstValueFrom(this.aulas.cambiarPortada(this.id(), portada));
      this.avisos.success(mensaje);
      this.aula.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  // ---------- Estudiantes ----------
  readonly busqueda = signal('');
  readonly soloRiesgo = signal(false);

  readonly estudiantes = computed(() => {
    const progreso = this.extra.value()?.progreso ?? [];
    const texto = this.busqueda().trim().toLowerCase();
    const detalles = new Map((this.seguimiento()?.estudiantes ?? []).map((e) => [e.estudiante.id, e]));
    const base = progreso.map((p) => ({ id: p.estudianteId, nombre: p.nombre, progreso: p.porcentaje, detalle: detalles.get(p.estudianteId) ?? null }));
    return base
      .filter((e) => !this.soloRiesgo() || e.detalle?.enRiesgo)
      .filter((e) => !texto || e.nombre.toLowerCase().includes(texto));
  });
  readonly enRiesgo = computed(() => this.seguimiento()?.estudiantes.filter((e) => e.enRiesgo).length ?? 0);

  aprueba(nota: number): boolean {
    return nota >= (this.seguimiento()?.config.notaAprobacion ?? 51);
  }

  motivo(e: EstudianteDeClase): string {
    const motivos: string[] = [];
    if (e.resultado.final !== null && !this.aprueba(e.resultado.final)) motivos.push('nota baja');
    if (e.asistencia.total && e.asistencia.porcentaje < ASISTENCIA_MINIMA) motivos.push('asistencia baja');
    return motivos.join(' y ');
  }

  esProxima(dia: number, inicio: string): boolean {
    const p = this.seguimiento()?.proxima;
    return !!p && new Date(`${p.fecha}T12:00:00`).getDay() === dia % 7 && p.inicio === inicio;
  }

  // ---------- Curso de academia ----------
  readonly editandoCurso = signal(false);
  readonly invitando = signal(false);
  readonly solicitudes = rxResource({
    params: () => this.aula.value(),
    stream: ({ params }) => (params?.tipo === 'curso' ? this.academia.getRequests(this.espacio.id, this.docenteId, params.id) : of([])),
    defaultValue: [],
  });

  alGuardarCurso(): void {
    this.editandoCurso.set(false);
    this.aula.reload();
  }

  async responder(s: Solicitud, aprobar: boolean): Promise<void> {
    try {
      await firstValueFrom(this.academia.respondToRequest(s.idInscripcion, aprobar));
      this.avisos.success(aprobar ? `${s.nombre} ya está inscrito en el curso.` : 'Solicitud rechazada.');
      this.solicitudes.reload();
      this.aula.reload();
      this.extra.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  async quitarEstudiante(id: number, nombre: string): Promise<void> {
    if (!confirm(`¿Quitar a ${nombre} del curso? Dejará de ver el contenido.`)) return;
    try {
      await firstValueFrom(this.academia.removeStudent(this.id(), id));
      this.avisos.success(`${nombre} ya no está en el curso.`);
      this.aula.reload();
      this.extra.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  alCambiarContenido(): void {
    this.aula.reload();
    this.extra.reload();
  }
}
