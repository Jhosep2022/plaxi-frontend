import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faCircleExclamation, faEye, faEyeSlash, faTicket } from '@fortawesome/free-solid-svg-icons';
import { SessionService, peekReturnUrl } from '../../core/auth/session.service';
import { AuthService } from '../../services/auth.service';
import { getErrorMessage } from '../management/academics/academics.ui';

// Sign in with a username or email.
@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    <header class="encabezado">
      <h1>¡Hola de nuevo!</h1>
      <p>Ingresa a tu cuenta para continuar.</p>
    </header>

    @if (hasInvitation) {
      <p class="aviso-invitacion"><fa-icon [icon]="faTicket" /> Inicia sesión para unirte al curso al que te invitaron.</p>
    }
    @if (notice() === 'clave') {
      <p class="aviso-invitacion"><fa-icon [icon]="faCircleCheck" /> Tu contraseña se cambió. Ya puedes iniciar sesión.</p>
    }

    <form class="ui-form" (submit)="$event.preventDefault(); signIn()" novalidate>
      <div class="ui-campo">
        <label for="login-usuario">Usuario o correo</label>
        <input id="login-usuario" class="ui-input" autocomplete="username" placeholder="Ej. maria.fernandez" [formField]="loginForm.username" />
        @if (loginForm.username().touched() && loginForm.username().invalid()) { <span class="ui-error">{{ loginForm.username().errors()[0].message }}</span> }
      </div>
      <div class="ui-campo">
        <div class="etiqueta-fila">
          <label for="login-clave">Contraseña</label>
          <a class="enlace" routerLink="/auth/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
        </div>
        <div class="campo-clave">
          <input id="login-clave" class="ui-input" [type]="showPassword() ? 'text' : 'password'" autocomplete="current-password" [formField]="loginForm.password" />
          <button type="button" class="ver-clave" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"><fa-icon [icon]="showPassword() ? faEyeSlash : faEye" /></button>
        </div>
        @if (loginForm.password().touched() && loginForm.password().invalid()) { <span class="ui-error">{{ loginForm.password().errors()[0].message }}</span> }
      </div>

      @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }

      <button type="submit" class="ui-btn boton-ancho" [disabled]="isSigningIn()">{{ isSigningIn() ? 'Entrando…' : 'Iniciar sesión' }}</button>
    </form>

    <p class="alterno">¿No tienes cuenta? <a class="enlace" routerLink="/auth/registro">Créala gratis</a></p>
    <p class="alterno">¿Eres un colegio? <a class="enlace" routerLink="/auth/colegio">Lleva Aulix a tu institución</a></p>
  `,
})
export class LoginComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private session = inject(SessionService);

  readonly faCircleCheck = faCircleCheck;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faTicket = faTicket;

  readonly notice = input<string>(undefined, { alias: 'aviso' });
  readonly hasInvitation = peekReturnUrl()?.startsWith('/unirse/') ?? false;

  readonly credentials = signal({ username: '', password: '' });
  readonly loginForm = form(this.credentials, (fields) => {
    required(fields.username, { message: 'Escribe tu usuario o correo.' });
    required(fields.password, { message: 'Escribe tu contraseña.' });
  });
  readonly showPassword = signal(false);
  readonly isSigningIn = signal(false);
  readonly error = signal('');

  signIn(): void {
    submit(this.loginForm, async () => {
      this.isSigningIn.set(true);
      this.error.set('');
      try {
        const { username, password } = this.credentials();
        const { usuarioId: userId } = await firstValueFrom(this.auth.login({ usuario: username, clave: password }));
        await firstValueFrom(this.session.startSession(userId));
        this.router.navigateByUrl(this.session.postLoginRoute());
      } catch (e) {
        this.error.set(getErrorMessage(e));
        this.isSigningIn.set(false);
      }
    });
  }
}
