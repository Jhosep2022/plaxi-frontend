import { Component, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDesktop, faEye, faEyeSlash, faKey, faLaptop, faMobileScreen, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import type { Dispositivo, Perfil } from '../../core/models/profile.model';
import { formatDateWithYear, formatLongDate } from '../../core/utils/attendance';
import { getPasswordError } from '../../core/utils/password';
import { AccountProfileService } from '../../services/account-profile.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';
import { getErrorMessage } from '../management/academics/academics.ui';

const VACIA = { actual: '', nueva: '', repetir: '' };

// Pestaña "Seguridad": cambio de contraseña, dispositivos con la sesión abierta y baja de la cuenta
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

  readonly perfil = input.required<Perfil>();
  readonly cambio = output<Perfil | null>();

  readonly formatDateWithYear = formatDateWithYear;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faKey = faKey;
  readonly faTriangleExclamation = faTriangleExclamation;

  private readonly usuarioId = this.session.userId()!;

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
        this.cambio.emit(await firstValueFrom(this.servicio.changePassword(this.usuarioId, m.actual, m.nueva)));
        this.avisos.success('Contraseña actualizada.');
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
  icono(d: Dispositivo) {
    return d.tipo === 'movil' ? faMobileScreen : d.nombre.includes('macOS') ? faLaptop : faDesktop;
  }

  cuando(iso: string): string {
    return `${formatLongDate(iso.slice(0, 10))}, ${iso.slice(11, 16)}`;
  }

  readonly otros = computed(() => this.perfil().dispositivos.filter((d) => !d.actual).length);

  async signOutDevice(d: Dispositivo): Promise<void> {
    try {
      this.cambio.emit(await firstValueFrom(this.servicio.signOutDevice(this.usuarioId, d.id)));
      this.avisos.success(`Cerraste la sesión en ${d.nombre}.`);
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  async cerrarOtros(): Promise<void> {
    if (!confirm('¿Cerrar la sesión en todos los demás dispositivos?')) return;
    try {
      this.cambio.emit(await firstValueFrom(this.servicio.signOutOtherDevices(this.usuarioId)));
      this.avisos.success('Cerraste la sesión en los demás dispositivos.');
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }

  // ---------- Baja ----------
  readonly bajaAbierta = signal(false);
  readonly confirmacion = signal('');
  readonly puedeDarDeBaja = computed(() => this.confirmacion().trim().toLowerCase() === this.perfil().username);
  readonly dandoDeBaja = signal(false);

  abrirBaja(): void {
    this.confirmacion.set('');
    this.bajaAbierta.set(true);
  }

  async darDeBaja(): Promise<void> {
    if (!this.puedeDarDeBaja()) return;
    this.dandoDeBaja.set(true);
    try {
      await firstValueFrom(this.servicio.darDeBaja(this.usuarioId));
      this.avisos.success('Tu cuenta fue dada de baja. ¡Gracias por haber sido parte!');
      this.session.signOut();
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
      this.dandoDeBaja.set(false);
    }
  }
}
