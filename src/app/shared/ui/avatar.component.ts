import { Component, computed, input } from '@angular/core';
import { avatarLabel, avatarUrl, initials, initialsColor, isInitialsCode } from '../../core/avatars';

// The one way to show a person: their photo (staff only), their gallery avatar or their initials in color.
@Component({
  selector: 'app-avatar',
  host: {
    class: 'app-avatar',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[class.round]': 'round()',
  },
  styles: `
    :host { display: inline-grid; place-items: center; flex-shrink: 0; overflow: hidden; border-radius: 28%; line-height: 1; }
    :host(.round) { border-radius: 50%; }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .initials { width: 100%; height: 100%; display: grid; place-items: center; font-weight: 800; }
  `,
  template: `
    @if (imageUrl()) {
      <img [src]="imageUrl()" [alt]="alt()" />
    } @else if (isInitials()) {
      <span class="initials" role="img" [attr.aria-label]="alt()" [style.background]="color().background" [style.color]="color().text" [style.font-size.px]="size() * 0.38">
        {{ text() }}
      </span>
    } @else {
      <img [src]="url()" [alt]="alt()" />
    }
  `,
})
export class AvatarComponent {
  readonly avatar = input<string | null | undefined>(null); // gallery code
  readonly imageUrl = input<string | null | undefined>(null); // staff photo, wins over the avatar
  readonly firstName = input('');
  readonly lastName = input('');
  readonly size = input(40);
  readonly round = input(true);
  readonly label = input<string | null>(null);

  readonly isInitials = computed(() => !this.avatar() || isInitialsCode(this.avatar()!));
  readonly color = computed(() => initialsColor(this.avatar() ?? ''));
  readonly text = computed(() => initials(this.firstName(), this.lastName()));
  readonly url = computed(() => avatarUrl(this.avatar()!));
  readonly alt = computed(() => this.label() ?? (this.firstName() ? `Avatar de ${this.firstName()}` : avatarLabel(this.avatar() ?? '')));
}
