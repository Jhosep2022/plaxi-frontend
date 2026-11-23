import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDesktop, faEye, faEyeSlash, faKey, faLaptop, faMobileScreen, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import type { ProfileDevice, UserProfile } from '../../core/models/profile.model';
import { formatDateWithYear, formatLongDate } from '../../core/utils/attendance';
import { getPasswordError } from '../../core/utils/password';
import { AccountProfileService } from '../../services/account-profile.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';
import { getErrorMessage } from '../management/academics/academics.ui';
import { fechaBolivia, horaBolivia } from '../../core/utils/bolivia-time';

const VACIA = { actual: '', nueva: '', repetir: '' };

// Pestaña "Seguridad": cambio de contraseña, dispositivos con la sesión abierta y baja de la cuenta (todo con la API)
@Component({
  selector: 'app-profile-security',
  imports: [FaIconComponent, FormField, DrawerComponent, PasswordStrengthComponent],
  templateUrl: './profile-security.component.html',
  styleUrls: ['./profile-sections.css', './profile-security.component.css'],
})
export class ProfileSecurityComponent {
  private session = inject(SessionService);
  private servicio = inject(AccountProfileService);
  private avisos = inject(NotificationService);

  readonly perfil = input.required<UserProfile>();
  readonly cambio = output<UserProfile | null>();

  readonly formatDateWithYear = formatDateWithYear;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faKey = faKey;
  readonly faTriangleExclamation = faTriangleExclamation;

  // ---------- Contraseña ----------
  readonly modelo = signal({ ...VACIA });
  readonly formulario = form(this.modelo, (s) => {
    required(s.actual, { message: 'Escribe tu contraseña actual.' });
    required(s.nueva, { message: 'Escribe la nueva contraseña.' });
    validate(s.nueva, ({ value }) => (getPasswordError(value()) ? { kind: 'debil', message: getPasswordError(value()) } : undefined));
    validate(s.repetir, ({ value, valueOf }) => (value() !== valueOf(s.nueva) ? { kind: 'distinta', message: 'Las contraseñas no coinciden.' } : undefined));
  });
  readonly mostrar = signal(false);
  readonly guardando = signal(false);

  changePassword(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        const m = this.modelo();
        this.cambio.emit(await firstValueFrom(this.servicio.changePassword(m.actual, m.nueva)));
        this.avisos.success('Contraseña actualizada. Cerramos la sesión en tus otros dispositivos.');
        this.dispositivos.reload();
        this.modelo.set({ ...VACIA });
        this.formulario().reset();
      } catch (error) {
        this.avisos.error(getErrorMessage(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  // ---------- Dispositivos ----------
  readonly dispositivos = rxResource({ stream: () => this.servicio.devices() });

  icono(d: ProfileDevice) {
    return d.tipo === 'movil' ? faMobileScreen : d.nombre.includes('macOS') ? faLaptop : faDesktop;
  }

  cuando(iso: string): string {
    return `${formatLongDate(fechaBolivia(iso))}, ${horaBolivia(iso)}`;
  }

  readonly otros = computed(() => (this.dispositivos.value() ?? []).filter((d) => !d.actual).length);

  async signOutDevice(d: ProfileDevice): Promise<void> {
    try {
      await firstValueFrom(this.servicio.signOutDevice(d.id));
      this.dispositivos.reload();
      this.avisos.success(`Cerraste la sesión en ${d.nombre}.`);
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  async cerrarOtros(): Promise<void> {
    if (!confirm('¿Cerrar la sesión en todos los demás dispositivos?')) return;
    try {
      await firstValueFrom(this.servicio.signOutOtherDevices());
      this.dispositivos.reload();
      this.avisos.success('Cerraste la sesión en los demás dispositivos.');
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  // ---------- Baja ----------
  // Asks for the username and the password; the API also refuses to leave a school without a director
  readonly bajaAbierta = signal(false);
  readonly confirmacion = signal('');
  readonly claveBaja = signal('');
  readonly verClaveBaja = signal(false);
  readonly puedeDarDeBaja = computed(() => this.confirmacion().trim().toLowerCase() === this.perfil().username && !!this.claveBaja());
  readonly dandoDeBaja = signal(false);

  abrirBaja(): void {
    this.confirmacion.set('');
    this.claveBaja.set('');
    this.verClaveBaja.set(false);
    this.bajaAbierta.set(true);
  }

  async darDeBaja(): Promise<void> {
    if (!this.puedeDarDeBaja()) return;
    this.dandoDeBaja.set(true);
    try {
      await firstValueFrom(this.servicio.darDeBaja(this.confirmacion(), this.claveBaja()));
      this.avisos.success('Tu cuenta fue dada de baja. ¡Gracias por haber sido parte!');
      this.session.signOut();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
      this.dandoDeBaja.set(false);
    }
  }
}
