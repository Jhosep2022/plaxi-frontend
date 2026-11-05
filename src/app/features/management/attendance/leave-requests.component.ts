import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faFileMedical, faPaperclip, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { paraleloLabel } from '../../../core/models/academics.model';
import { EstadoLicencia, Licencia } from '../../../core/models/attendance.model';
import { fechaCorta } from '../../../core/utils/attendance';
import { AcademicsService } from '../../../services/academics.service';
import { AttendanceService } from '../../../services/attendance.service';
import { ProfileService } from '../../../services/profile.service';
import { NotificationService } from '../../../shared/ui/notification.service';
import { DrawerComponent } from '../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { getErrorMessage } from '../academics/academics.ui';

// Licencias solicitadas por los padres: la dirección las aprueba o rechaza
@Component({
  selector: 'app-leave-requests',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormsModule, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  styleUrls: ['./leave-requests.component.css'],
  templateUrl: './leave-requests.component.html',
})
export class LeaveRequestsComponent {
  private session = inject(SessionService);
  private asistencia = inject(AttendanceService);
  private academico = inject(AcademicsService);
  private perfiles = inject(ProfileService);
  private avisos = inject(NotificationService);

  readonly faCheck = faCheck;
  readonly faXmark = faXmark;
  readonly faPaperclip = faPaperclip;
  readonly faFileMedical = faFileMedical;
  private readonly espacioId = this.session.espacioActivo()!.id;

  readonly datos = rxResource({
    stream: () => forkJoin({
      licencias: this.asistencia.licencias(this.espacioId),
      estudiantes: this.asistencia.estudiantes(),
      paralelos: this.academico.paralelosActivos(this.espacioId),
      perfiles: this.perfiles.getAllProfiles(),
    }),
  });

  readonly filtro = signal<EstadoLicencia>('pendiente');

  readonly conteo = computed(() => {
    const c: Record<EstadoLicencia, number> = { pendiente: 0, aprobada: 0, rechazada: 0 };
    for (const l of this.datos.value()?.licencias ?? []) c[l.estado]++;
    return c;
  });

  readonly lista = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    return d.licencias
      .filter((l) => l.estado === this.filtro())
      .map((l) => {
        const est = d.estudiantes.find((e) => e.id === l.estudianteId);
        const paralelo = d.paralelos.find((p) => p.id === est?.paraleloId);
        const padre = d.perfiles.find((p) => p.idUsuario === l.solicitadaPor);
        return {
          licencia: l,
          estudiante: est?.nombre ?? 'Estudiante',
          paralelo: paralelo ? paraleloLabel(paralelo) : '',
          solicitante: padre ? `Solicitada por ${padre.nombre} ${padre.primerApellido} (tutor legal)` : 'Registrada por el colegio',
        };
      });
  });

  // ---------- Responder ----------
  readonly respondiendo = signal<{ licencia: Licencia; estado: 'aprobada' | 'rechazada' } | null>(null);
  readonly comentario = signal('');
  readonly guardando = signal(false);

  abrir(licencia: Licencia, estado: 'aprobada' | 'rechazada'): void {
    this.comentario.set('');
    this.respondiendo.set({ licencia, estado });
  }

  async confirmar(): Promise<void> {
    const r = this.respondiendo();
    if (!r) return;
    if (r.estado === 'rechazada' && !this.comentario().trim()) {
      this.avisos.error('Explica al padre el motivo del rechazo.');
      return;
    }
    this.guardando.set(true);
    try {
      await firstValueFrom(this.asistencia.responderLicencia(r.licencia, r.estado, this.comentario().trim()));
      this.avisos.success(r.estado === 'aprobada' ? 'Licencia aprobada. La asistencia de esos días quedó como licencia.' : 'Licencia rechazada.');
      this.respondiendo.set(null);
      this.datos.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.guardando.set(false);
    }
  }

  rango(l: Licencia): string {
    return l.desde === l.hasta ? fechaCorta(l.desde) : `${fechaCorta(l.desde)} – ${fechaCorta(l.hasta)}`;
  }

  dias(l: Licencia): number {
    return Math.round((new Date(`${l.hasta}T12:00:00`).getTime() - new Date(`${l.desde}T12:00:00`).getTime()) / 86400000) + 1;
  }
}
