import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { FormField, form, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBullhorn, faCalendarDays, faEye, faPaperPlane, faPlus, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { compararParalelos, paraleloLabel } from '../../core/models/academico.model';
import { CATEGORIAS_COMUNICADO, CategoriaComunicado, Comunicado, PUBLICOS, Publico } from '../../core/models/comunicados.model';
import { fechaLarga, hoyIso } from '../../core/utils/asistencia';
import { porcentaje } from '../../core/utils/reportes';
import { AcademicoService } from '../../services/academico.service';
import { Alcance, ComunicadosService } from '../../services/comunicados.service';
import { ProfileService } from '../../services/profile.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { mensajeError } from '../direccion/academico/academico.ui';
import { categoria, cuando, publicoLabel } from './comunicados.ui';

type Enviado = Comunicado & { alcance: Alcance };

const BORRADOR = { titulo: '', mensaje: '', categoria: 'general' as CategoriaComunicado, fechaEvento: '', importante: false, pideConfirmacion: false };

// Comunicados enviados (dirección: todos los del colegio; docente: los suyos), con su alcance, redacción y detalle
@Component({
  selector: 'app-comunicados-enviados',
  imports: [FaIconComponent, FormField, DrawerComponent, EmptyStateComponent],
  templateUrl: './enviados.component.html',
  styleUrls: ['./comunicados.css'],
})
export class EnviadosComponent {
  private session = inject(SessionService);
  private servicio = inject(ComunicadosService);
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private perfiles = inject(ProfileService);

  readonly esDireccion = input(false);

  readonly categorias = CATEGORIAS_COMUNICADO;
  readonly categoria = categoria;
  readonly cuando = cuando;
  readonly fechaLarga = fechaLarga;
  readonly publicoLabel = publicoLabel;
  readonly porcentaje = porcentaje;
  readonly paraleloLabel = paraleloLabel;
  readonly faBullhorn = faBullhorn;
  readonly faCalendarDays = faCalendarDays;
  readonly faEye = faEye;
  readonly faPaperPlane = faPaperPlane;
  readonly faPlus = faPlus;
  readonly faTrash = faTrash;
  readonly faUsers = faUsers;

  private readonly espacio = this.session.espacioActivo()!;
  private readonly usuarioId = this.session.usuarioId()!;

  readonly enviados = rxResource({
    params: () => this.esDireccion(),
    stream: ({ params }) => this.servicio.enviados(this.espacio.id, params ? null : this.usuarioId),
    defaultValue: [],
  });

  // Cursos a los que puede escribir: la dirección a todos; el docente a los suyos
  readonly cursos = rxResource({
    params: () => this.esDireccion(),
    stream: ({ params }) =>
      forkJoin({ paralelos: this.academico.paralelosActivos(this.espacio.id), asignaciones: params ? of([]) : this.academico.asignacionesActivas(this.espacio.id) }),
  });
  readonly cursosDisponibles = computed(() => {
    const c = this.cursos.value();
    if (!c) return [];
    const propios = new Set(c.asignaciones.filter((a) => a.docenteId === this.usuarioId).map((a) => a.paraleloId));
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
  readonly alcance = computed(() => (this.publico().length && (this.esDireccion() && this.todoElColegio() || this.paraleloIds().length) ? this.servicio.contar(this.publico(), this.cursosElegidos()) : 0));

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
        const autor = { id: this.usuarioId, nombre: await this.nombreAutor(), rol: this.esDireccion() ? 'direccion' as const : 'docente' as const };
        await firstValueFrom(this.servicio.publicar(this.espacio.id, autor, { ...this.modelo(), publico: this.publico(), paraleloIds: this.cursosElegidos() },
          this.esDireccion() ? null : this.cursosDisponibles().map((p) => p.id)));
        this.avisos.exito(`Comunicado enviado a ${this.alcance()} personas.`);
        this.redactando.set(false);
        this.enviados.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
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
      this.avisos.exito('Comunicado eliminado.');
      this.detalle.set(null);
      this.enviados.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  readonly hoy = hoyIso();

  private async nombreAutor(): Promise<string> {
    const p = await firstValueFrom(this.perfiles.getProfile(this.usuarioId));
    return `${p.nombre} ${p.primerApellido}`.trim();
  }
}
