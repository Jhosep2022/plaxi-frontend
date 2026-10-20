import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClock, faCommentDots, faPaperclip, faPaperPlane, faStar, faTasks } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ESTADO_ENTREGA } from '../../core/models/tareas.model';
import { fechaCorta } from '../../core/utils/asistencia';
import { urgente, venceLabel } from '../../core/utils/tareas';
import { HijoActivoService } from '../../services/hijo-activo.service';
import { TareaDeEstudiante, TareasService } from '../../services/tareas.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { iconoMateria } from '../../shared/ui/iconos-academicos';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SelectorHijoComponent } from '../../shared/ui/selector-hijo.component';
import { mensajeError } from '../direccion/academico/academico.ui';

type Pestana = 'por-entregar' | 'entregadas' | 'revisadas';

// "Tareas" del estudiante (entrega sus trabajos) y del padre (ve las de su hijo, solo lectura)
@Component({
  selector: 'app-mis-tareas',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, DrawerComponent, SelectorHijoComponent],
  templateUrl: './mis-tareas.component.html',
  styleUrls: ['./mis-tareas.component.css'],
})
export class MisTareasComponent {
  private session = inject(SessionService);
  private servicio = inject(TareasService);
  private hijoActivo = inject(HijoActivoService);
  private avisos = inject(AvisosService);

  readonly estados = ESTADO_ENTREGA;
  readonly iconoMateria = iconoMateria;
  readonly venceLabel = venceLabel;
  readonly urgente = urgente;
  readonly faClock = faClock;
  readonly faCommentDots = faCommentDots;
  readonly faPaperclip = faPaperclip;
  readonly faPaperPlane = faPaperPlane;
  readonly faStar = faStar;
  readonly faTasks = faTasks;

  readonly espacio = this.session.espacioActivo()!;
  readonly esPadre = this.session.rolActivo() === 'padre';

  // Estudiante del que se muestran las tareas (el propio o el hijo elegido) y sus tareas
  readonly datos = rxResource({
    params: () => (this.esPadre ? this.hijoActivo.elegidoId() : 0),
    stream: () => {
      const quien$ = this.esPadre
        ? this.hijoActivo.activo().pipe(map((h) => (h ? { id: h.id, nombre: h.nombre } : null)))
        : of({ id: this.session.usuarioId()!, nombre: '' });
      return quien$.pipe(
        switchMap((quien) => (quien ? this.servicio.tareasDeEstudiante(this.espacio.id, quien.id).pipe(map((tareas) => ({ quien, tareas }))) : of(null)))
      );
    },
  });

  readonly pestana = signal<Pestana>('por-entregar');
  private readonly tareas = computed(() => this.datos.value()?.tareas ?? []);
  readonly grupos = computed(() => ({
    'por-entregar': this.tareas().filter((t) => t.estado === 'pendiente' || t.estado === 'no-entregada'),
    entregadas: this.tareas().filter((t) => t.estado === 'entregada' || t.estado === 'tarde'),
    revisadas: [...this.tareas().filter((t) => t.estado === 'revisada')].reverse(),
  }));
  readonly visibles = computed(() => this.grupos()[this.pestana()]);
  readonly vencidas = computed(() => this.tareas().filter((t) => t.estado === 'no-entregada').length);

  readonly titulo = computed(() => (this.esPadre && this.datos.value()?.quien.nombre ? `Tareas de ${this.datos.value()!.quien.nombre}` : 'Mis tareas'));

  entregadaLabel(t: TareaDeEstudiante): string {
    const iso = t.entrega?.entregadaEl ?? '';
    return iso ? `${fechaCorta(iso.slice(0, 10))}, ${iso.slice(11, 16)}` : '';
  }

  // ---------- Entregar ----------
  readonly entregando = signal<TareaDeEstudiante | null>(null);
  readonly texto = signal('');
  readonly archivo = signal('');
  readonly enviando = signal(false);

  abrirEntrega(t: TareaDeEstudiante): void {
    this.texto.set(t.entrega?.texto ?? '');
    this.archivo.set(t.entrega?.archivo ?? '');
    this.entregando.set(t);
  }

  elegirArchivo(event: Event): void {
    this.archivo.set((event.target as HTMLInputElement).files?.[0]?.name ?? this.archivo());
  }

  async entregar(): Promise<void> {
    const t = this.entregando();
    if (!t) return;
    this.enviando.set(true);
    try {
      await firstValueFrom(this.servicio.entregar(t.tarea.id, this.session.usuarioId()!, this.texto(), this.archivo()));
      this.avisos.exito(t.entrega ? 'Entrega actualizada.' : `¡Listo! Entregaste "${t.tarea.titulo}".`);
      this.entregando.set(null);
      this.pestana.set('entregadas');
      this.datos.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.enviando.set(false);
    }
  }
}
