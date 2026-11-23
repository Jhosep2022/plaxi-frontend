import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faChalkboardTeacher, faCircleQuestion, faDoorOpen, faKey, faSchool, faStar } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { SPACE_ROLE_LABEL, SPACE_TYPE_LABEL } from '../../core/models/space.model';
import type { ProfileSpace } from '../../core/models/profile.model';
import { formatMonthYear } from '../../core/utils/attendance';
import { AccountProfileService } from '../../services/account-profile.service';
import { ProfileActivityService } from '../../services/profile-activity.service';
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
  private actividad = inject(ProfileActivityService);
  private avisos = inject(NotificationService);
  private router = inject(Router);

  readonly rolLabel = SPACE_ROLE_LABEL;
  readonly tipoLabel = SPACE_TYPE_LABEL;
  readonly formatMonthYear = formatMonthYear;
  readonly faArrowRight = faArrowRight;
  readonly faChalkboardTeacher = faChalkboardTeacher;
  readonly faCircleQuestion = faCircleQuestion;
  readonly faDoorOpen = faDoorOpen;
  readonly faKey = faKey;
  readonly faSchool = faSchool;
  readonly faStar = faStar;

  readonly espacios = rxResource({ stream: () => this.actividad.espacios(), defaultValue: [] });
  readonly predeterminado = signal(this.session.defaultSpace());
  readonly codigo = signal('');
  readonly rechazando = signal('');

  esActual(e: ProfileSpace): boolean {
    return this.session.activeSpace()?.id === e.espacioId;
  }

  rutaInicio(e: ProfileSpace): string {
    return `/${e.slug}/${e.rol}/inicio`;
  }

  fijar(e: ProfileSpace): void {
    const slug = this.predeterminado() === e.slug ? null : e.slug;
    this.session.setDefaultSpace(slug);
    this.predeterminado.set(slug);
    this.avisos.success(slug ? `Al iniciar sesión entrarás directo a ${e.nombre}.` : 'Al iniciar sesión podrás elegir el espacio.');
  }

  async salir(e: ProfileSpace): Promise<void> {
    if (!confirm(`¿Salir de ${e.nombre}? Perderás el acceso a sus cursos y tu avance en ellos.`)) return;
    try {
      await firstValueFrom(this.actividad.salirDeEspacio(e.slug));
      const eraActual = this.esActual(e);
      this.session.removeMembership(e.espacioId);
      this.avisos.success(`Saliste de ${e.nombre}.`);
      if (eraActual) this.router.navigateByUrl(this.session.postLoginRoute());
      else this.espacios.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  // A school joined this account by its email and it is not the person's (audit finding 15)
  async rechazar(e: ProfileSpace): Promise<void> {
    const rol = this.rolLabel[e.rol].toLowerCase();
    if (!confirm(`¿No te corresponde ser ${rol} en ${e.nombre}? Tu cuenta deja ese espacio y avisamos a la dirección para que corrija el correo. Tus otros espacios no cambian.`)) return;
    this.rechazando.set(e.slug + e.rol);
    try {
      await firstValueFrom(this.actividad.rechazarEspacio(e.slug, e.rol));
      // With another role in the same space (docente and padre) the person stays in it
      const otroRol = this.espacios.value().some((o) => o.espacioId === e.espacioId && o.rol !== e.rol);
      const eraActual = this.esActual(e) && !otroRol;
      if (!otroRol) this.session.removeMembership(e.espacioId);
      this.avisos.success(`Listo: ya no eres ${this.rolLabel[e.rol].toLowerCase()} en ${e.nombre}. Avisamos a su dirección.`);
      if (eraActual) this.router.navigateByUrl(this.session.postLoginRoute());
      else this.espacios.reload();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.rechazando.set('');
    }
  }

  unirme(): void {
    const codigo = this.codigo().trim().toUpperCase();
    if (!/^[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(codigo)) return this.avisos.error('El código tiene el formato ABC-1234.');
    this.router.navigate(['/unirse', codigo]);
  }
}
