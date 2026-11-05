import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBullhorn, faCalendarDays, faCircleCheck, faExclamation, faHandshake } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { formatLongDate } from '../../core/utils/attendance';
import { ComunicadoRecibido, AnnouncementsService } from '../../services/announcements.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { getErrorMessage } from '../management/academics/academics.ui';
import { categoria, cuando } from './announcements.ui';

type Filtro = 'todos' | 'no-leidos' | 'importantes';

// Bandeja de comunicados recibidos (padre, estudiante y docente): lista + lectura, con "Enterado" cuando se pide
@Component({
  selector: 'app-announcements-inbox',
  imports: [FaIconComponent, EmptyStateComponent],
  templateUrl: './inbox.component.html',
  styleUrls: ['./announcements.css'],
})
export class InboxComponent {
  private session = inject(SessionService);
  private servicio = inject(AnnouncementsService);
  private avisos = inject(NotificationService);

  readonly categoria = categoria;
  readonly cuando = cuando;
  readonly formatLongDate = formatLongDate;
  readonly faBullhorn = faBullhorn;
  readonly faCalendarDays = faCalendarDays;
  readonly faCircleCheck = faCircleCheck;
  readonly faExclamation = faExclamation;
  readonly faHandshake = faHandshake;

  private readonly usuarioId = this.session.userId()!;
  private readonly recibidos = rxResource({ stream: () => this.servicio.recibidos(this.session.activeSpace()!.id, this.usuarioId), defaultValue: [] });

  // Copia local para marcar leídos y confirmados sin recargar la lista
  readonly lista = linkedSignal<ComunicadoRecibido[]>(() => this.recibidos.value());
  readonly cargando = computed(() => this.recibidos.isLoading() && !this.lista().length);

  readonly filtro = signal<Filtro>('todos');
  readonly conteo = computed(() => ({
    todos: this.lista().length,
    noLeidos: this.lista().filter((x) => !x.lectura).length,
    importantes: this.lista().filter((x) => x.comunicado.importante).length,
    porConfirmar: this.lista().filter((x) => x.comunicado.pideConfirmacion && !x.lectura?.confirmado).length,
  }));
  readonly visibles = computed(() =>
    this.lista().filter((x) => this.filtro() === 'todos' || (this.filtro() === 'no-leidos' ? !x.lectura : x.comunicado.importante))
  );

  readonly abiertoId = signal(0);
  readonly abierto = computed(() => this.lista().find((x) => x.comunicado.id === this.abiertoId()) ?? null);
  readonly confirmando = signal(false);

  async abrir(item: ComunicadoRecibido): Promise<void> {
    this.abiertoId.set(item.comunicado.id);
    if (item.lectura) return;
    const lectura = await firstValueFrom(this.servicio.marcarLeido(item.comunicado.id, this.usuarioId));
    this.actualizar(item.comunicado.id, lectura);
  }

  async confirmar(item: ComunicadoRecibido): Promise<void> {
    this.confirmando.set(true);
    try {
      const lectura = await firstValueFrom(this.servicio.confirmar(item.comunicado.id, this.usuarioId));
      this.actualizar(item.comunicado.id, lectura);
      this.avisos.success('Confirmaste que recibiste el comunicado.');
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.confirmando.set(false);
    }
  }

  private actualizar(id: number, lectura: ComunicadoRecibido['lectura']): void {
    this.lista.update((l) => l.map((x) => (x.comunicado.id === id ? { ...x, lectura } : x)));
  }
}
