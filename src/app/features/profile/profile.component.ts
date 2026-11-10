import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faCamera } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { defaultAvatar } from '../../core/avatars';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { AvatarPickerComponent } from './avatar-picker.component';
import { SessionService } from '../../core/auth/session.service';
import { SPACE_ROLE_LABEL } from '../../core/models/space.model';
import { PHOTO_MAX_KB, UserProfile } from '../../core/models/profile.model';
import { formatMonthYear } from '../../core/utils/attendance';
import { AccountProfileService } from '../../services/account-profile.service';
import { NotificationService } from '../../shared/ui/notification.service';
import { getErrorMessage } from '../management/academics/academics.ui';
import { ProfileDetailsComponent } from './profile-details.component';
import { ProfileSpacesComponent } from './profile-spaces.component';
import { ProfilePreferencesComponent } from './profile-preferences.component';
import { ProfileSecurityComponent } from './profile-security.component';

export type PestanaPerfil = 'datos' | 'espacios' | 'seguridad' | 'preferencias';

// "Mi perfil": cabecera con foto e indicadores del rol, y pestañas de datos, espacios, seguridad y preferencias
@Component({
  selector: 'app-profile',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, RouterLink, Tooltip, AvatarComponent, AvatarPickerComponent, ProfileDetailsComponent, ProfileSpacesComponent, ProfileSecurityComponent, ProfilePreferencesComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent {
  private session = inject(SessionService);
  private servicio = inject(AccountProfileService);
  private avisos = inject(NotificationService);

  readonly faCamera = faCamera;
  readonly faCalendarDays = faCalendarDays;
  readonly formatMonthYear = formatMonthYear;
  readonly PHOTO_MAX_KB = PHOTO_MAX_KB;

  readonly tab = input<PestanaPerfil>('datos'); // de la ruta (data)
  readonly membresia = this.session.activeMembership()!;
  readonly rolLabel = SPACE_ROLE_LABEL[this.membresia.rol];
  private readonly usuarioId = this.session.userId()!;

  readonly avatarAutomatico = defaultAvatar(this.usuarioId);
  readonly galeriaAbierta = signal(false);
  readonly guardandoAvatar = signal(false);

  readonly datos = rxResource({ stream: () => this.servicio.perfil(this.usuarioId) });
  // Copia local que se actualiza al guardar cualquier sección sin volver a cargar la página
  readonly perfil = linkedSignal<UserProfile | null>(() => this.datos.value() ?? null);
  readonly indicadores = rxResource({ stream: () => this.servicio.indicadores(this.membresia, this.usuarioId), defaultValue: [] });

  readonly nombreCompleto = computed(() => {
    const p = this.perfil();
    return p ? [p.nombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ') : '';
  });

  readonly pestanas: { id: PestanaPerfil; label: string; link: (string | number)[] }[] = [
    { id: 'datos', label: 'Datos personales', link: this.session.spaceRoute('perfil') },
    { id: 'espacios', label: 'Mis espacios', link: this.session.spaceRoute('perfil', 'espacios') },
    { id: 'seguridad', label: 'Seguridad', link: this.session.spaceRoute('perfil', 'seguridad') },
    { id: 'preferencias', label: 'Preferencias', link: this.session.spaceRoute('perfil', 'preferencias') },
  ];

  actualizado(perfil: UserProfile | null): void {
    this.perfil.set(perfil);
  }

  // ---------- Avatar ----------
  async elegirAvatar(avatar: string | null): Promise<void> {
    if (this.guardandoAvatar()) return;
    this.guardandoAvatar.set(true);
    try {
      this.perfil.set(await firstValueFrom(this.servicio.changeAvatar(this.usuarioId, avatar)));
      this.avisos.success(avatar ? 'Avatar actualizado.' : 'Volviste a tu avatar automático.');
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    } finally {
      this.guardandoAvatar.set(false);
    }
  }

  // ---------- Foto (solo docentes y dirección) ----------
  elegirFoto(event: Event): void {
    const entrada = event.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) return this.avisos.error('La foto debe ser una imagen.');
    if (archivo.size > PHOTO_MAX_KB * 1024) return this.avisos.error(`La foto debe pesar menos de ${PHOTO_MAX_KB} KB.`);
    const lector = new FileReader();
    lector.onload = () => this.guardarFoto(String(lector.result), 'Foto de perfil actualizada.');
    lector.readAsDataURL(archivo);
  }

  async guardarFoto(foto: string, mensaje: string): Promise<void> {
    try {
      this.perfil.set(await firstValueFrom(this.servicio.changePhoto(this.usuarioId, foto)));
      this.avisos.success(mensaje);
    } catch (error) {
      this.avisos.error(getErrorMessage(error));
    }
  }
}
