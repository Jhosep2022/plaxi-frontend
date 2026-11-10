import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { SessionService } from '../../core/auth/session.service';
import { getPasswordError } from '../../core/utils/password';

@Component({
  selector: 'app-change-temporary-password',
  imports: [FormField],
  styleUrls: ['./auth.css'],
  template: `
    <main class="auth-temporary-password">
      <h1>Cambia tu contraseña temporal</h1>
      <p>Para proteger tu cuenta, elige una contraseña nueva antes de continuar.</p>
      <form class="ui-form" (submit)="$event.preventDefault(); changePassword()" novalidate>
        <div class="ui-campo">
          <label for="current-password">Contraseña temporal</label>
          <input id="current-password" type="password" class="ui-input" autocomplete="current-password" [formField]="passwordForm.current" />
          @if (passwordForm.current().touched() && passwordForm.current().invalid()) { <span class="ui-error">{{ passwordForm.current().errors()[0].message }}</span> }
        </div>
        <div class="ui-campo">
          <label for="new-password">Contraseña nueva</label>
          <input id="new-password" type="password" class="ui-input" autocomplete="new-password" [formField]="passwordForm.next" />
          @if (passwordForm.next().touched() && passwordForm.next().invalid()) { <span class="ui-error">{{ passwordForm.next().errors()[0].message }}</span> }
        </div>
        <div class="ui-campo">
          <label for="confirm-password">Repite la contraseña nueva</label>
          <input id="confirm-password" type="password" class="ui-input" autocomplete="new-password" [formField]="passwordForm.confirmation" />
          @if (passwordForm.confirmation().touched() && passwordForm.confirmation().invalid()) { <span class="ui-error">{{ passwordForm.confirmation().errors()[0].message }}</span> }
        </div>
        @if (error()) { <p class="error-general" role="alert">{{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Guardando…' : 'Guardar y entrar' }}</button>
      </form>
    </main>
  `,
  styles: `.auth-temporary-password { max-width: 420px; margin: 8vh auto; padding: 24px; }`,
})
export class ChangeTemporaryPasswordComponent {
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly details = signal({ current: '', next: '', confirmation: '' });
  readonly passwordForm = form(this.details, (fields) => {
    required(fields.current, { message: 'Escribe la contraseña temporal.' });
    required(fields.next, { message: 'Escribe una contraseña nueva.' });
    validate(fields.next, ({ value }) => getPasswordError(value()) ? { kind: 'weak', message: getPasswordError(value()) } : undefined);
    validate(fields.confirmation, ({ value }) => value() !== this.details().next ? { kind: 'mismatch', message: 'Las contraseñas no coinciden.' } : undefined);
  });
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  changePassword(): void {
    submit(this.passwordForm, async () => {
      this.isSubmitting.set(true);
      this.error.set('');
      try {
        const { current, next } = this.details();
        await firstValueFrom(this.auth.changeTemporaryPassword(current, next));
        this.session.finishTemporaryPasswordChange();
        await this.router.navigateByUrl(this.session.postLoginRoute());
      } catch (error) {
        this.error.set(readApiError(error).message);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
