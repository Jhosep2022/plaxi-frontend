import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBullhorn, faCalendarDays, faEye, faPaperPlane, faPlus, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../core/models/academics.model';
import { CATEGORIAS_COMUNICADO, CategoriaComunicado, Comunicado, PUBLICOS, Publico } from '../../core/models/announcements.model';
import { formatLongDate, todayIso } from '../../core/utils/attendance';
import { calculatePercentage } from '../../core/utils/reports';
import { AcademicsService } from '../../services/academics.service';
import { Alcance, AnnouncementsService } from '../../services/announcements.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { getErrorMessage } from '../management/academics/academics.ui';
import { categoria, cuando, publicoLabel } from './announcements.ui';
import { SELECT } from '../../shared/ui/select.component';

type Enviado = Comunicado & { alcance: Alcance };

const BORRADOR = { titulo: '', mensaje: '', categoria: 'general' as CategoriaComunicado, fechaEvento: '', importante: false, pideConfirmacion: false };

// Comunicados enviados (dirección: todos los del colegio; docente: los suyos), con su alcance, redacción y detalle
@Component({
  selector: 'app-sent-announcements',
  imports: [...SELECT, FaIconComponent, FormField, DrawerComponent, EmptyStateComponent],
  templateUrl: './sent.component.html',
  styleUrls: ['./announcements.css'],
})
export class SentComponent {
  private session = inject(SessionService);
  private servicio = inject(AnnouncementsService);
  private academico = inject(AcademicsService);
  private avisos = inject(NotificationService);

  readonly esDireccion = input(false);

  readonly categorias = CATEGORIAS_COMUNICADO;
  readonly categoria = categoria;
  readonly cuando = cuando;
  readonly formatLongDate = formatLongDate;
  readonly publicoLabel = publicoLabel;
  readonly calculatePercentage = calculatePercentage;
  readonly paraleloLabel = paraleloLabel;
  readonly faBullhorn = faBullhorn;
  readonly faCalendarDays = faCalendarDays;
  readonly faEye = faEye;
  readonly faPaperPlane = faPaperPlane;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faUsers = faUsers;

  private readonly espacio = this.session.activeSpace()!;
  private readonly usuarioId = this.session.userId()!;
  readonly rol = computed(() => (this.esDireccion() ? ('direccion' as const) : ('docente' as const)));

  readonly enviados = rxResource({
    params: () => this.rol(),
    stream: ({ params }) => this.servicio.enviados(params),
    defaultValue: [],
  });

  // Cursos a los que puede escribir: la dirección a todos; el docente a los suyos
  readonly cursos = rxResource({
    params: () => this.esDireccion(),
    stream: ({ params }) =>
      forkJoin({
        paralelos: this.academico.getActiveClassGroups(this.espacio.id),
        asignaciones: params ? of([]) : this.academico.getActiveAllocations(this.espacio.id),
        // A teacher's assignments point to their teacher record, not to their account
        fichas: params ? of<number[]>([]) : this.servicio.misFichasDocente(),
      }),
  });
  readonly cursosDisponibles = computed(() => {
    const c = this.cursos.value();
    if (!c) return [];
    const fichas = new Set(c.fichas);
    const propios = new Set(c.asignaciones.filter((a) => fichas.has(a.docenteId)).map((a) => a.paraleloId));
    return [...c.paralelos].filter((p) => this.esDireccion() || propios.has(p.id)).sort(compararParalelos);
  });
  readonly publicos = computed(() => PUBLICOS.filter((p) => this.esDireccion() || p.id !== 'docentes'));

  cursosLabel(c: Comunicado): string {
    if (!c.paraleloIds.length) return 'Todo el colegio';
    const nombres = new Map((this.cursos.value()?.paralelos ?? []).map((p) => [p.id, paraleloLabel(p)]));
    return c.paraleloIds.map((id) => nombres.get(id) ?? '').join(', ');
  }

  // ---------- Redactar ----------
  readonly redactando = signal(false);
  readonly enviando = signal(false);
  readonly modelo = signal({ ...BORRADOR });
  readonly publico = signal<Publico[]>([]);
  readonly todoElColegio = signal(true);
  readonly paraleloIds = signal<number[]>([]);
  readonly formulario = form(this.modelo, (s) => {
    required(s.titulo, { message: 'Ponle un título.' });
    maxLength(s.titulo, 100, { message: 'Máximo 100 caracteres.' });
    required(s.mensaje, { message: 'Escribe el mensaje.' });
    minLength(s.mensaje, 10, { message: 'El mensaje es muy corto.' });
  });

  private readonly cursosElegidos = computed(() => (this.esDireccion() && this.todoElColegio() ? [] : this.paraleloIds()));
  // Asked to the API, which counts the real recipients (only people with an account)
  private readonly conteo = rxResource({
    params: () =>
      this.redactando() && this.publico().length && ((this.esDireccion() && this.todoElColegio()) || this.paraleloIds().length)
        ? { rol: this.rol(), publico: this.publico(), cursos: this.cursosElegidos() }
        : null,
    stream: ({ params }) => (params ? this.servicio.contar(params.rol, params.publico, params.cursos) : of(0)),
    defaultValue: 0,
  });
  readonly alcance = computed(() => this.conteo.value() ?? 0);

  nuevo(): void {
    this.modelo.set({ ...BORRADOR });
    this.publico.set(['padres']);
    this.todoElColegio.set(this.esDireccion());
    this.paraleloIds.set(this.esDireccion() ? [] : this.cursosDisponibles().slice(0, 1).map((p) => p.id));
    this.formulario().reset();
    this.redactando.set(true);
  }

  alternarPublico(id: Publico, activo: boolean): void {
    this.publico.update((ps) => PUBLICOS.map((p) => p.id).filter((p) => (p === id ? activo : ps.includes(p))));
  }

  alternarCurso(id: number, activo: boolean): void {
    this.paraleloIds.update((ids) => (activo ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  enviar(): void {
    submit(this.formulario, async () => {
      this.enviando.set(true);
      try {
        const enviado = await firstValueFrom(this.servicio.publicar(this.rol(), { ...this.modelo(), publico: this.publico(), paraleloIds: this.cursosElegidos() }));
        this.avisos.success(`Comunicado enviado a ${enviado.alcance.destinatarios} personas.`);
        this.redactando.set(false);
        this.enviados.reload();
      } catch (error) {
        this.avisos.error(getErrorMessage(error));
      } finally {
        this.enviando.set(false);
      }
    });
  }

  // ---------- Detalle ----------
  readonly detalle = signal<Enviado | null>(null);
  readonly pendientes = rxResource({
    params: () => this.detalle(),
    stream: ({ params }) => (params ? this.servicio.pendientes(params) : of([])),
    defaultValue: [],
  });

  puedeEliminar(c: Comunicado): boolean {
    return this.esDireccion() || c.autorId === this.usuarioId;
  }

  async eliminar(c: Enviado): Promise<void> {
    if (!confirm(`¿Eliminar "${c.titulo}"? Dejará de verse en las bandejas de sus destinatarios.`)) return;
    try {
      await firstValueFrom(this.servicio.eliminar(c));
      this.avisos.success('Comunicado eliminado.');
      this.detalle.set(null);
      this.enviados.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  readonly hoy = todayIso();

}
