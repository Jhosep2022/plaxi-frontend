import { Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleExclamation, faEye, faEyeSlash, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import { getPasswordError } from '../../core/utils/password';
import { AuthService } from '../../services/auth.service';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';
import { getErrorMessage } from '../management/academics/academics.ui';

// Reset the password using the token from the email link.
@Component({
  selector: 'app-reset-password',
  imports: [FormField, RouterLink, FaIconComponent, PasswordStrengthComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (tokenValidation.isLoading()) {
      <p class="ui-ayuda">Revisando el enlace…</p>
    } @else if (!tokenValidation.value()) {
      <div class="exito">
        <span class="icono invalid-token"><fa-icon [icon]="faLinkSlash" /></span>
        <h1>Este enlace ya no es válido</h1>
        <p>Puede que ya lo hayas usado o que haya vencido. Pide uno nuevo.</p>
      </div>
      <a class="ui-btn boton-ancho" routerLink="/auth/recuperar-contrasena">Pedir otro enlace</a>
    } @else {
      <header class="encabezado">
        <h1>Crea tu contraseña nueva</h1>
        <p>Elige una que no uses en otros sitios.</p>
      </header>
      <form class="ui-form" (submit)="$event.preventDefault(); savePassword()" novalidate>
        <div class="ui-campo">
          <label for="nc-clave">Contraseña nueva</label>
          <div class="campo-clave">
            <input id="nc-clave" class="ui-input" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" [formField]="resetForm.password" />
            <button type="button" class="ver-clave" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"><fa-icon [icon]="showPassword() ? faEyeSlash : faEye" /></button>
          </div>
          @if (resetForm.password().touched() && resetForm.password().invalid()) { <span class="ui-error">{{ resetForm.password().errors()[0].message }}</span> }
        </div>
        <div class="ui-campo">
          <label for="nc-repetir">Repite la contraseña</label>
          <input id="nc-repetir" class="ui-input" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" [formField]="resetForm.confirmation" />
          @if (resetForm.confirmation().touched() && resetForm.confirmation().invalid()) { <span class="ui-error">{{ resetForm.confirmation().errors()[0].message }}</span> }
        </div>
        <app-password-strength [password]="formData().password" />
        @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="isSaving()">{{ isSaving() ? 'Guardando…' : 'Guardar contraseña' }}</button>
      </form>
    }
  `,
  styles: `.icono.invalid-token { background: #fdf0ee; color: #c0392b; }`,
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly faCircleExclamation = faCircleExclamation;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faLinkSlash = faLinkSlash;

  readonly token = input<string>();
  readonly tokenValidation = rxResource({ params: () => this.token(), stream: ({ params }) => (params ? this.auth.isResetTokenValid(params) : of(false)) });

  readonly formData = signal({ password: '', confirmation: '' });
  readonly resetForm = form(this.formData, (fields) => {
    required(fields.password, { message: 'Escribe la contraseña nueva.' });
    validate(fields.password, ({ value }) => (getPasswordError(value()) ? { kind: 'weak', message: getPasswordError(value()) } : undefined));
    validate(fields.confirmation, ({ value, valueOf }) => (value() !== valueOf(fields.password) ? { kind: 'mismatch', message: 'Las contraseñas no coinciden.' } : undefined));
  });
  readonly showPassword = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');

  savePassword(): void {
    submit(this.resetForm, async () => {
      this.isSaving.set(true);
      this.error.set('');
      try {
        await firstValueFrom(this.auth.resetPassword(this.token() ?? '', this.formData().password));
        this.router.navigate(['/auth/login'], { queryParams: { aviso: 'clave' } });
      } catch (e) {
        this.error.set(getErrorMessage(e));
        this.isSaving.set(false);
      }
    });
  }
}
