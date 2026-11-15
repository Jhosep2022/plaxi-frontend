import { Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { readApiError } from '../../core/api/api-error';
import { AccountProfileService } from '../../services/account-profile.service';

// Opens the link we sent to the new email of an account. It works with or without a session:
// the link may be opened on a phone where the person never signed in.
@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (confirmation.isLoading()) {
      <p class="ui-ayuda">Confirmando tu correo…</p>
    } @else if (confirmation.value(); as correo) {
      <div class="exito">
        <span class="icono"><fa-icon [icon]="faCircleCheck" /></span>
        <h1>Correo confirmado</h1>
        <p>Desde ahora tu cuenta usa <strong>{{ correo }}</strong>. Ahí te llegarán los avisos y la recuperación de contraseña.</p>
      </div>
      <a class="ui-btn boton-ancho" [routerLink]="session.isAuthenticated() ? '/' : '/auth/login'">{{ session.isAuthenticated() ? 'Volver a Aulix' : 'Iniciar sesión' }}</a>
    } @else {
      <div class="exito">
        <span class="icono invalid-token"><fa-icon [icon]="faLinkSlash" /></span>
        <h1>Este enlace ya no es válido</h1>
        <p>{{ errorMessage() }}</p>
      </div>
      <a class="ui-btn boton-ancho" [routerLink]="session.isAuthenticated() ? '/' : '/auth/login'">{{ session.isAuthenticated() ? 'Volver a Aulix' : 'Iniciar sesión' }}</a>
    }
  `,
  styles: `.icono.invalid-token { background: #fdf0ee; color: #c0392b; }`,
})
export class ConfirmEmailComponent {
  private profile = inject(AccountProfileService);
  readonly session = inject(SessionService);

  readonly faCircleCheck = faCircleCheck;
  readonly faLinkSlash = faLinkSlash;

  readonly token = input<string>();
  readonly confirmation = rxResource({
    params: () => this.token(),
    stream: ({ params }) => (params ? this.profile.confirmEmailChange(params) : of('')),
  });

  errorMessage(): string {
    const error = this.confirmation.error();
    // The resource wraps values that are not an Error (HttpErrorResponse) in .cause
    return error ? readApiError((error as { cause?: unknown }).cause ?? error).message : 'Falta el enlace. Ábrelo desde el correo que te enviamos.';
  }
}
