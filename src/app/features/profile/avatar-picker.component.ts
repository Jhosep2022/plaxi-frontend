import { Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faCheck, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { AVATAR_ANIMALS, INITIALS_COLORS, avatarLabel } from '../../core/avatars';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { DrawerComponent } from '../../shared/ui/drawer.component';

// Gallery to choose an avatar (HU-AV-02). Tapping one saves it at once. Staff can also upload a photo (HU-AV-03).
@Component({
  selector: 'app-avatar-picker',
  imports: [AvatarComponent, DrawerComponent, FaIconComponent, Tooltip],
  styles: `
    .actual { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 16px; background: var(--light-cream); }
    .actual strong { display: block; color: var(--dark-blue); }
    .actual small { color: var(--muted); font-size: 13px; }
    h3 { margin: 22px 0 10px; font-size: 14px; color: var(--dark-blue); }
    .grilla { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .opcion {
      position: relative; display: grid; place-items: center; padding: 6px; border: 2px solid transparent;
      border-radius: 18px; background: var(--text-light); cursor: pointer; transition: transform 0.15s, border-color 0.15s;
    }
    .opcion:hover { transform: translateY(-2px); border-color: var(--line); }
    .opcion:focus-visible { outline: 2px solid var(--dark-blue); outline-offset: 2px; }
    .opcion.elegido { border-color: var(--lime-green); background: #f6f9e3; }
    .opcion:disabled { cursor: wait; opacity: 0.6; }
    .marca {
      position: absolute; top: 2px; right: 2px; width: 22px; height: 22px; display: grid; place-items: center;
      border-radius: 50%; background: var(--lime-green); color: var(--dark-blue); font-size: 11px;
    }
    .acciones { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .foto input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .ayuda { margin: 8px 0 0; font-size: 13px; color: var(--muted); }
  `,
  template: `
    <app-drawer [abierto]="open()" titulo="Elige tu avatar" subtitulo="Se ve en tu perfil, tus clases, tus entregas y tus notas." (cerrar)="close.emit()">
      <div class="actual">
        <app-avatar [avatar]="current()" [imageUrl]="photoUrl()" [firstName]="firstName()" [lastName]="lastName()" [size]="64" />
        <div>
          <strong>{{ photoUrl() ? 'Usas una foto' : currentLabel() }}</strong>
          <small>{{ isAutomatic() ? 'Es el avatar automático que Aulix te asignó.' : 'Toca otro para cambiarlo al instante.' }}</small>
        </div>
      </div>

      @if (canUploadPhoto()) {
        <div class="acciones">
          <label class="ui-btn ui-btn--secundario foto" pTooltip="PNG, JPG, WEBP o GIF de hasta 800 KB. Solo docentes y dirección pueden usar foto." tooltipPosition="bottom">
            <fa-icon [icon]="faCamera" /> {{ photoUrl() ? 'Cambiar foto' : 'Subir foto' }}
            <input type="file" accept="image/*" (change)="uploadPhoto.emit($event)" />
          </label>
          @if (photoUrl()) {
            <button type="button" class="ui-btn ui-btn--secundario" (click)="removePhoto.emit()" pTooltip="Quita la foto y vuelve a tu avatar" tooltipPosition="bottom">Usar avatar</button>
          }
        </div>
      } @else {
        <p class="ayuda">Para cuidar a los estudiantes, en Aulix no se suben fotos: cada persona usa un avatar.</p>
      }

      <h3>Animales</h3>
      <div class="grilla" role="radiogroup" aria-label="Avatares de animales">
        @for (code of animalCodes; track code) {
          <button type="button" class="opcion" role="radio" [class.elegido]="code === current() && !photoUrl()" [attr.aria-checked]="code === current()"
            [disabled]="saving()" [pTooltip]="label(code)" tooltipPosition="top" (click)="choose.emit(code)">
            <app-avatar [avatar]="code" [size]="58" [round]="false" [label]="label(code)" />
            @if (code === current() && !photoUrl()) { <span class="marca"><fa-icon [icon]="faCheck" /></span> }
          </button>
        }
      </div>

      <h3>Tus iniciales</h3>
      <div class="grilla" role="radiogroup" aria-label="Iniciales con color">
        @for (color of initialsColors; track color.code) {
          <button type="button" class="opcion" role="radio" [class.elegido]="color.code === current() && !photoUrl()" [attr.aria-checked]="color.code === current()"
            [disabled]="saving()" [pTooltip]="'Iniciales, color ' + ($index + 1)" tooltipPosition="top" (click)="choose.emit(color.code)">
            <app-avatar [avatar]="color.code" [firstName]="firstName()" [lastName]="lastName()" [size]="58" [round]="false" [label]="'Iniciales, color ' + ($index + 1)" />
            @if (color.code === current() && !photoUrl()) { <span class="marca"><fa-icon [icon]="faCheck" /></span> }
          </button>
        }
      </div>

      <div class="acciones">
        <button type="button" class="ui-btn ui-btn--secundario" [disabled]="saving() || isAutomatic()" (click)="choose.emit(null)"
          pTooltip="Vuelve al avatar que Aulix te asignó al crear tu cuenta" tooltipPosition="top">
          <fa-icon [icon]="faRotateLeft" /> Usar el automático
        </button>
      </div>
    </app-drawer>
  `,
})
export class AvatarPickerComponent {
  readonly open = input(false);
  readonly current = input<string>('');
  readonly automatic = input<string>('');
  readonly photoUrl = input<string | null | undefined>(null);
  readonly firstName = input('');
  readonly lastName = input('');
  readonly canUploadPhoto = input(false);
  readonly saving = input(false);

  readonly choose = output<string | null>();
  readonly uploadPhoto = output<Event>();
  readonly removePhoto = output<void>();
  readonly close = output<void>();

  readonly faCamera = faCamera;
  readonly faCheck = faCheck;
  readonly faRotateLeft = faRotateLeft;
  readonly animalCodes = AVATAR_ANIMALS.flatMap((animal) => [1, 2, 3].map((n) => `${animal.id}-0${n}`));
  readonly initialsColors = INITIALS_COLORS;
  readonly label = avatarLabel;
  readonly isAutomatic = computed(() => this.current() === this.automatic());
  readonly currentLabel = computed(() => `Tu avatar: ${avatarLabel(this.current())}`);
}
