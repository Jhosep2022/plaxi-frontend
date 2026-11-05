import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faChalkboardTeacher, faDoorOpen, faKey, faSchool, faStar } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { SPACE_ROLE_LABEL, SPACE_TYPE_LABEL } from '../../core/models/space.model';
import type { EspacioDelPerfil } from '../../core/models/profile.model';
import { formatMonthYear } from '../../core/utils/attendance';
import { AccountProfileService } from '../../services/account-profile.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { getErrorMessage } from '../management/academics/academics.ui';

// Pestaña "Mis espacios": colegios y academias del usuario, espacio predeterminado, salir y unirse con un código
@Component({
  selector: 'app-profile-spaces',
  imports: [FaIconComponent, RouterLink],
  templateUrl: './profile-spaces.component.html',
  styleUrls: ['./profile-sections.css', './profile-spaces.component.css'],
})
export class ProfileSpacesComponent {
  readonly session = inject(SessionService);
  private servicio = inject(AccountProfileService);
  private avisos = inject(NotificationService);
  private router = inject(Router);

  readonly rolLabel = SPACE_ROLE_LABEL;
  readonly tipoLabel = SPACE_TYPE_LABEL;
  readonly formatMonthYear = formatMonthYear;
  readonly faArrowRight = faArrowRight;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faDoorOpen = faDoorOpen;
  readonly faKey = faKey;
  readonly faSchool = faSchool;
  readonly faStar = faStar;

  private readonly usuarioId = this.session.userId()!;
  readonly espacios = rxResource({ stream: () => this.servicio.espacios(this.usuarioId), defaultValue: [] });
  readonly predeterminado = signal(this.session.defaultSpace());
  readonly codigo = signal('');

  esActual(e: EspacioDelPerfil): boolean {
    return this.session.activeSpace()?.id === e.espacioId;
  }

  rutaInicio(e: EspacioDelPerfil): string {
    return `/${e.slug}/${e.rol}/inicio`;
  }

  fijar(e: EspacioDelPerfil): void {
    const slug = this.predeterminado() === e.slug ? null : e.slug;
    this.session.setDefaultSpace(slug);
    this.predeterminado.set(slug);
    this.avisos.success(slug ? `Al iniciar sesión entrarás directo a ${e.nombre}.` : 'Al iniciar sesión podrás elegir el espacio.');
  }

  async salir(e: EspacioDelPerfil): Promise<void> {
    if (!confirm(`¿Salir de ${e.nombre}? Perderás el acceso a sus cursos y tu avance en ellos.`)) return;
    try {
      await firstValueFrom(this.servicio.salirDeEspacio(this.usuarioId, e.espacioId));
      const eraActual = this.esActual(e);
      this.session.removeMembership(e.espacioId);
      this.avisos.success(`Saliste de ${e.nombre}.`);
      if (eraActual) this.router.navigateByUrl(this.session.postLoginRoute());
      else this.espacios.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  unirme(): void {
    const codigo = this.codigo().trim().toUpperCase();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(codigo)) return this.avisos.error('El código tiene el formato ABC-1234.');
    this.router.navigate(['/unirse', codigo]);
  }
}
