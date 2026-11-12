import { Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom, of } from 'rxjs';
import { AuthApiService, type ActivationStatus } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { SessionService } from '../../core/auth/session.service';
import { getPasswordError } from '../../core/utils/password';

@Component({
  selector: 'app-activate-account',
  imports: [FormField, RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (invitation.isLoading()) {
      <p>Comprobando tu invitación…</p>
    } @else if (!invitation.value()?.valido) {
      <h1>El enlace ya no sirve</h1>
      <p>Pide a tu colegio que te envíe una nueva invitación.</p>
      <a routerLink="/auth/login">Volver al inicio</a>
    } @else {
      <h1>Activa tu cuenta</h1>
      <p>Hola, {{ invitation.value()?.nombre }}. Tu usuario es <strong>{{ invitation.value()?.usuario }}</strong>.</p>
      <form class="ui-form" (submit)="$event.preventDefault(); activate()" novalidate>
        <div class="ui-campo">
          <label for="activation-password">Crea una contraseña</label>
          <div class="campo-clave">
            <input id="activation-password" [type]="showPassword() ? 'text' : 'password'" class="ui-input" autocomplete="new-password" [formField]="activationForm.password" />
            <button type="button" class="ver-clave" (click)="showPassword.update((visible) => !visible)" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showPassword()"><fa-icon [icon]="showPassword() ? faEyeSlash : faEye" /></button>
          </div>
          @if (activationForm.password().touched() && activationForm.password().invalid()) { <span class="ui-error">{{ activationForm.password().errors()[0].message }}</span> }
        </div>
        <div class="ui-campo">
          <label for="activation-confirmation">Repite la contraseña</label>
          <div class="campo-clave">
            <input id="activation-confirmation" [type]="showConfirmation() ? 'text' : 'password'" class="ui-input" autocomplete="new-password" [formField]="activationForm.confirmation" />
            <button type="button" class="ver-clave" (click)="showConfirmation.update((visible) => !visible)" [attr.aria-label]="showConfirmation() ? 'Ocultar confirmación' : 'Mostrar confirmación'" [attr.aria-pressed]="showConfirmation()"><fa-icon [icon]="showConfirmation() ? faEyeSlash : faEye" /></button>
          </div>
          @if (activationForm.confirmation().touched() && activationForm.confirmation().invalid()) { <span class="ui-error">{{ activationForm.confirmation().errors()[0].message }}</span> }
        </div>
        @if (error()) { <p class="error-general" role="alert">{{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Activando…' : 'Activar cuenta' }}</button>
      </form>
    }
  `,
})
export class ActivateAccountComponent {
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly token = input<string>();
  readonly invitation = rxResource({ params: () => this.token(), stream: ({ params }) => params ? this.auth.getActivationStatus(params) : of<ActivationStatus>({ valido: false }) });
  readonly details = signal({ password: '', confirmation: '' });
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly activationForm = form(this.details, (fields) => {
    required(fields.password, { message: 'Crea una contraseña.' });
    validate(fields.password, ({ value }) => getPasswordError(value()) ? { kind: 'weak', message: getPasswordError(value()) } : undefined);
    validate(fields.confirmation, ({ value }) => value() !== this.details().password ? { kind: 'mismatch', message: 'Las contraseñas no coinciden.' } : undefined);
  });
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  activate(): void {
    submit(this.activationForm, async () => {
      const token = this.token();
      if (!token) return;
      this.isSubmitting.set(true);
      this.error.set('');
      try {
        this.session.applyApiSession(await firstValueFrom(this.auth.activateWithInvitation(token, this.details().password)));
        await this.router.navigateByUrl(this.session.postLoginRoute());
      } catch (error) {
        this.error.set(readApiError(error).message);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
