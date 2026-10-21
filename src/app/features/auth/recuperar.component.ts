import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField, form, pattern, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faCircleExclamation, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';
import { PATRON_CORREO } from '../../services/perfil.service';
import { mensajeError } from '../direccion/academico/academico.ui';

// "¿Olvidaste tu contraseña?": pide el correo y envía un enlace para crear una nueva
@Component({
  selector: 'app-recuperar',
  imports: [FormField, RouterLink, FaIconComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (enviadoA(); as correo) {
      <div class="exito">
        <span class="icono"><fa-icon [icon]="faEnvelopeOpenText" /></span>
        <h1>Revisa tu correo</h1>
        <p>Si <strong>{{ correo }}</strong> tiene una cuenta en QuizWiz, te enviamos un enlace para crear una contraseña nueva. Vence en 1 hora.</p>
        <p class="ui-ayuda">¿No llegó? Revisa la carpeta de spam o <button type="button" class="enlace boton-enlace" (click)="enviadoA.set(null)">inténtalo con otro correo</button>.</p>
        @if (token()) {
          <div class="simulacion">
            Mientras no haya servidor de correo, abre el enlace desde aquí:
            <a class="enlace" id="enlace-recuperacion" routerLink="/auth/nueva-contrasena" [queryParams]="{ token: token() }">Crear mi contraseña nueva</a>
          </div>
        }
      </div>
      <a class="ui-btn ui-btn--secundario boton-ancho" routerLink="/auth/login"><fa-icon [icon]="faArrowLeft" /> Volver a iniciar sesión</a>
    } @else {
      <header class="encabezado">
        <h1>¿Olvidaste tu contraseña?</h1>
        <p>Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.</p>
      </header>
      <form class="ui-form" (submit)="$event.preventDefault(); enviar()" novalidate>
        <div class="ui-campo">
          <label for="rec-correo">Correo electrónico</label>
          <input id="rec-correo" type="email" class="ui-input" autocomplete="email" [formField]="formulario.correo" />
          @if (formulario.correo().touched() && formulario.correo().invalid()) { <span class="ui-error">{{ formulario.correo().errors()[0].message }}</span> }
        </div>
        @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="enviando()">{{ enviando() ? 'Enviando…' : 'Enviar enlace' }}</button>
      </form>
      <p class="alterno"><a class="enlace" routerLink="/auth/login"><fa-icon [icon]="faArrowLeft" /> Volver a iniciar sesión</a></p>
    }
  `,
  styles: `.boton-enlace { padding: 0; border: none; background: none; font: inherit; cursor: pointer; }`,
})
export class RecuperarComponent {
  private auth = inject(AuthService);

  readonly faArrowLeft = faArrowLeft;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faEnvelopeOpenText = faEnvelopeOpenText;

  readonly modelo = signal({ correo: '' });
  readonly formulario = form(this.modelo, (s) => {
    required(s.correo, { message: 'Escribe tu correo.' });
    pattern(s.correo, PATRON_CORREO, { message: 'Escribe un correo válido.' });
  });
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly enviadoA = signal<string | null>(null);
  readonly token = signal<string | null>(null);

  enviar(): void {
    submit(this.formulario, async () => {
      this.enviando.set(true);
      this.error.set('');
      try {
        const { token } = await firstValueFrom(this.auth.recuperar(this.modelo().correo));
        this.token.set(token);
        this.enviadoA.set(this.modelo().correo.trim().toLowerCase());
      } catch (e) {
        this.error.set(mensajeError(e));
      } finally {
        this.enviando.set(false);
      }
    });
  }
}
