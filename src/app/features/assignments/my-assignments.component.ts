import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClock, faCommentDots, faPaperclip, faPaperPlane, faStar, faTasks } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ESTADO_ENTREGA, type ArchivoEntrega } from '../../core/models/assignments.model';
import { formatShortDate } from '../../core/utils/attendance';
import { isDueSoon, formatDueDate } from '../../core/utils/assignments';
import { SelectedChildService } from '../../services/selected-child.service';
import { AssignmentsService, ENTREGA_MAX_MB, TareaDeEstudiante } from '../../services/assignments.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { subjectIcon } from '../../shared/ui/academic-icons';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { ChildSelectorComponent } from '../../shared/ui/child-selector.component';
import { getErrorMessage } from '../management/academics/academics.ui';

type Pestana = 'por-entregar' | 'entregadas' | 'revisadas';

// "Tareas" del estudiante (entrega sus trabajos) y del padre (ve las de su hijo, solo lectura)
const MAX_ARCHIVOS = 3; // por entrega (lo valida también el servidor)

@Component({
  selector: 'app-my-assignments',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, DrawerComponent, ChildSelectorComponent],
  templateUrl: './my-assignments.component.html',
  styleUrls: ['./my-assignments.component.css'],
})
export class MyAssignmentsComponent {
  private session = inject(SessionService);
  private servicio = inject(AssignmentsService);
  private hijoActivo = inject(SelectedChildService);
  private avisos = inject(NotificationService);

  readonly estados = ESTADO_ENTREGA;
  readonly subjectIcon = subjectIcon;
  readonly formatDueDate = formatDueDate;
  readonly isDueSoon = isDueSoon;
  readonly faClock = faClock;
  readonly faCommentDots = faCommentDots;
  readonly faPaperclip = faPaperclip;
  readonly faPaperPlane = faPaperPlane;
  readonly faStar = faStar;
  readonly faTasks = faTasks;

  readonly espacio = this.session.activeSpace()!;
  readonly esPadre = this.session.activeRole() === 'padre';

  // Estudiante del que se muestran las tareas (el propio o el hijo elegido) y sus tareas
  readonly datos = rxResource({
    params: () => (this.esPadre ? this.hijoActivo.elegidoId() : 0),
    stream: () => {
      const quien$ = this.esPadre
        ? this.hijoActivo.activo().pipe(map((h) => (h ? { id: h.id, nombre: h.nombre } : null)))
        : of({ id: 0, nombre: '' });
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
    return iso ? `${formatShortDate(iso.slice(0, 10))}, ${iso.slice(11, 16)}` : '';
  }

  // ---------- Entregar ----------
  readonly entregando = signal<TareaDeEstudiante | null>(null);
  readonly texto = signal('');
  readonly conservados = signal<ArchivoEntrega[]>([]); // archivos ya entregados que se mantienen
  readonly nuevos = signal<File[]>([]);
  readonly enviando = signal(false);
  readonly maxArchivos = MAX_ARCHIVOS;
  readonly maxMb = ENTREGA_MAX_MB;
  readonly totalArchivos = computed(() => this.conservados().length + this.nuevos().length);

  abrirEntrega(t: TareaDeEstudiante): void {
    this.texto.set(t.entrega?.texto ?? '');
    this.conservados.set((t.entrega?.archivos ?? []).filter((a) => a.archivoId));
    this.nuevos.set([]);
    this.entregando.set(t);
  }

  elegirArchivos(event: Event): void {
    const entrada = event.target as HTMLInputElement;
    const elegidos = [...(entrada.files ?? [])];
    entrada.value = '';
    const grande = elegidos.find((f) => f.size > ENTREGA_MAX_MB * 1024 * 1024);
    if (grande) return this.avisos.error(`${grande.name} pesa más de ${ENTREGA_MAX_MB} MB.`);
    if (this.totalArchivos() + elegidos.length > MAX_ARCHIVOS) return this.avisos.error(`Puedes adjuntar hasta ${MAX_ARCHIVOS} archivos.`);
    this.nuevos.update((l) => [...l, ...elegidos]);
  }

  quitarConservado(archivoId: number | undefined): void {
    this.conservados.update((l) => l.filter((a) => a.archivoId !== archivoId));
  }

  quitarNuevo(i: number): void {
    this.nuevos.update((l) => l.filter((_, j) => j !== i));
  }

  // Abre el archivo entregado con un enlace temporal
  async abrirArchivo(archivo: ArchivoEntrega): Promise<void> {
    if (!archivo.archivoId) return;
    try {
      window.open(await firstValueFrom(this.servicio.enlaceArchivo(archivo.archivoId)), '_blank', 'noopener');
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  async entregar(): Promise<void> {
    const t = this.entregando();
    if (!t) return;
    this.enviando.set(true);
    try {
      await firstValueFrom(this.servicio.entregar(t.tarea.id, this.texto(), this.nuevos(), this.conservados().map((a) => a.archivoId!)));
      this.avisos.success(t.entrega ? 'Entrega actualizada.' : `¡Listo! Entregaste "${t.tarea.titulo}".`);
      this.entregando.set(null);
      this.pestana.set('entregadas');
      this.datos.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.enviando.set(false);
    }
  }
}
