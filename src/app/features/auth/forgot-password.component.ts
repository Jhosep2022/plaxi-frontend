import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCircleExclamation, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { AuthApiService } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { PATRON_CORREO } from '../../services/account-profile.service';

// Request a password reset link by email.
@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (sentTo(); as email) {
      <div class="exito">
        <span class="icono"><fa-icon [icon]="faEnvelopeOpenText" /></span>
        <h1>Revisa tu correo</h1>
        <p>Si <strong>{{ email }}</strong> tiene una cuenta en Aulix, te enviamos un enlace para crear una contraseña nueva. Vence en 1 hora.</p>
        <p class="ui-ayuda">¿No llegó? Revisa la carpeta de spam o <button type="button" class="enlace boton-enlace" (click)="sentTo.set(null)">inténtalo con otro correo</button>.</p>
      </div>
      <a class="ui-btn ui-btn--secundario boton-ancho" routerLink="/auth/login"><fa-icon [icon]="faArrowLeft" /> Volver a iniciar sesión</a>
    } @else {
      <header class="encabezado">
        <h1>¿Olvidaste tu contraseña?</h1>
        <p>Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.</p>
      </header>
      <form class="ui-form" (submit)="$event.preventDefault(); requestPasswordReset()" novalidate>
        <div class="ui-campo">
          <label for="rec-correo">Correo electrónico</label>
          <input id="rec-correo" type="email" class="ui-input" autocomplete="email" [formField]="resetForm.email" />
          @if (resetForm.email().touched() && resetForm.email().invalid()) { <span class="ui-error">{{ resetForm.email().errors()[0].message }}</span> }
        </div>
        @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Enviando…' : 'Enviar enlace' }}</button>
      </form>
      <p class="alterno"><a class="enlace" routerLink="/auth/login"><fa-icon [icon]="faArrowLeft" /> Volver a iniciar sesión</a></p>
    }
  `,
  styles: `.boton-enlace { padding: 0; border: none; background: none; font: inherit; cursor: pointer; }`,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthApiService);

  readonly faArrowLeft = faArrowLeft;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faEnvelopeOpenText = faEnvelopeOpenText;

  readonly formData = signal({ email: '' });
  readonly resetForm = form(this.formData, (fields) => {
    required(fields.email, { message: 'Escribe tu correo.' });
    pattern(fields.email, PATRON_CORREO, { message: 'Escribe un correo válido.' });
  });
  readonly isSubmitting = signal(false);
  readonly error = signal('');
  readonly sentTo = signal<string | null>(null);

  requestPasswordReset(): void {
    submit(this.resetForm, async () => {
      this.isSubmitting.set(true);
      this.error.set('');
      try {
        await firstValueFrom(this.auth.requestPasswordReset(this.formData().email));
        this.sentTo.set(this.formData().email.trim().toLowerCase());
      } catch (e) {
        const apiError = readApiError(e);
        this.error.set(apiError.fields['correo'] ?? apiError.message);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
