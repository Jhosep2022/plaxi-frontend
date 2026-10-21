import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleCheck, faCircleExclamation, faEye, faEyeSlash, faTicket } from '@fortawesome/free-solid-svg-icons';
import { SessionService, verVolverA } from '../../core/auth/session.service';
import { AuthService } from '../../services/auth.service';
import { mensajeError } from '../direccion/academico/academico.ui';

// Iniciar sesión con usuario o correo
@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    <header class="encabezado">
      <h1>¡Hola de nuevo!</h1>
      <p>Ingresa a tu cuenta para continuar.</p>
    </header>

    @if (invitacion) {
      <p class="aviso-invitacion"><fa-icon [icon]="faTicket" /> Inicia sesión para unirte al curso al que te invitaron.</p>
    }
    @if (aviso() === 'clave') {
      <p class="aviso-invitacion"><fa-icon [icon]="faCircleCheck" /> Tu contraseña se cambió. Ya puedes iniciar sesión.</p>
    }

    <form class="ui-form" (submit)="$event.preventDefault(); entrar()" novalidate>
      <div class="ui-campo">
        <label for="login-usuario">Usuario o correo</label>
        <input id="login-usuario" class="ui-input" autocomplete="username" placeholder="Ej. maria.fernandez" [formField]="formulario.usuario" />
        @if (formulario.usuario().touched() && formulario.usuario().invalid()) { <span class="ui-error">{{ formulario.usuario().errors()[0].message }}</span> }
      </div>
      <div class="ui-campo">
        <div class="etiqueta-fila">
          <label for="login-clave">Contraseña</label>
          <a class="enlace" routerLink="/auth/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
        </div>
        <div class="campo-clave">
          <input id="login-clave" class="ui-input" [type]="mostrar() ? 'text' : 'password'" autocomplete="current-password" [formField]="formulario.clave" />
          <button type="button" class="ver-clave" (click)="mostrar.set(!mostrar())" [attr.aria-label]="mostrar() ? 'Ocultar contraseña' : 'Mostrar contraseña'"><fa-icon [icon]="mostrar() ? faEyeSlash : faEye" /></button>
        </div>
        @if (formulario.clave().touched() && formulario.clave().invalid()) { <span class="ui-error">{{ formulario.clave().errors()[0].message }}</span> }
      </div>

      @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }

      <button type="submit" class="ui-btn boton-ancho" [disabled]="entrando()">{{ entrando() ? 'Entrando…' : 'Iniciar sesión' }}</button>
    </form>

    <p class="alterno">¿No tienes cuenta? <a class="enlace" routerLink="/auth/registro">Créala gratis</a></p>
    <p class="alterno">¿Eres un colegio? <a class="enlace" routerLink="/auth/colegio">Lleva QuizWiz a tu institución</a></p>
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

  readonly aviso = input<string>(); // ?aviso=clave después de restablecer la contraseña
  readonly invitacion = verVolverA()?.startsWith('/unirse/') ?? false;

  readonly modelo = signal({ usuario: '', clave: '' });
  readonly formulario = form(this.modelo, (s) => {
    required(s.usuario, { message: 'Escribe tu usuario o correo.' });
    required(s.clave, { message: 'Escribe tu contraseña.' });
  });
  readonly mostrar = signal(false);
  readonly entrando = signal(false);
  readonly error = signal('');

  entrar(): void {
    submit(this.formulario, async () => {
      this.entrando.set(true);
      this.error.set('');
      try {
        const { usuarioId } = await firstValueFrom(this.auth.login(this.modelo()));
        await firstValueFrom(this.session.iniciarSesion(usuarioId));
        this.router.navigateByUrl(this.session.rutaPostLogin());
      } catch (e) {
        this.error.set(mensajeError(e));
        this.entrando.set(false);
      }
    });
  }
}
