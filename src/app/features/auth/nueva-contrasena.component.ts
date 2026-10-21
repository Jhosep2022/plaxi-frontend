import { Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleExclamation, faEye, faEyeSlash, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import { errorClave } from '../../core/utils/clave';
import { AuthService } from '../../services/auth.service';
import { MedidorClaveComponent } from '../../shared/ui/medidor-clave.component';
import { mensajeError } from '../direccion/academico/academico.ui';

// Crear una contraseña nueva desde el enlace del correo (?token=…)
@Component({
  selector: 'app-nueva-contrasena',
  imports: [FormField, RouterLink, FaIconComponent, MedidorClaveComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (valido.isLoading()) {
      <p class="ui-ayuda">Revisando el enlace…</p>
    } @else if (!valido.value()) {
      <div class="exito">
        <span class="icono invalido"><fa-icon [icon]="faLinkSlash" /></span>
        <h1>Este enlace ya no es válido</h1>
        <p>Puede que ya lo hayas usado o que haya vencido. Pide uno nuevo.</p>
      </div>
      <a class="ui-btn boton-ancho" routerLink="/auth/recuperar-contrasena">Pedir otro enlace</a>
    } @else {
      <header class="encabezado">
        <h1>Crea tu contraseña nueva</h1>
        <p>Elige una que no uses en otros sitios.</p>
      </header>
      <form class="ui-form" (submit)="$event.preventDefault(); guardar()" novalidate>
        <div class="ui-campo">
          <label for="nc-clave">Contraseña nueva</label>
          <div class="campo-clave">
            <input id="nc-clave" class="ui-input" [type]="mostrar() ? 'text' : 'password'" autocomplete="new-password" [formField]="formulario.clave" />
            <button type="button" class="ver-clave" (click)="mostrar.set(!mostrar())" [attr.aria-label]="mostrar() ? 'Ocultar contraseña' : 'Mostrar contraseña'"><fa-icon [icon]="mostrar() ? faEyeSlash : faEye" /></button>
          </div>
          @if (formulario.clave().touched() && formulario.clave().invalid()) { <span class="ui-error">{{ formulario.clave().errors()[0].message }}</span> }
        </div>
        <div class="ui-campo">
          <label for="nc-repetir">Repite la contraseña</label>
          <input id="nc-repetir" class="ui-input" [type]="mostrar() ? 'text' : 'password'" autocomplete="new-password" [formField]="formulario.repetir" />
          @if (formulario.repetir().touched() && formulario.repetir().invalid()) { <span class="ui-error">{{ formulario.repetir().errors()[0].message }}</span> }
        </div>
        <app-medidor-clave [clave]="modelo().clave" />
        @if (error()) { <p class="error-general" role="alert"><fa-icon [icon]="faCircleExclamation" /> {{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar contraseña' }}</button>
      </form>
    }
  `,
  styles: `.icono.invalido { background: #fdf0ee; color: #c0392b; }`,
})
export class NuevaContrasenaComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly faCircleExclamation = faCircleExclamation;
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faLinkSlash = faLinkSlash;

  readonly token = input<string>();
  readonly valido = rxResource({ params: () => this.token(), stream: ({ params }) => (params ? this.auth.tokenValido(params) : of(false)) });

  readonly modelo = signal({ clave: '', repetir: '' });
  readonly formulario = form(this.modelo, (s) => {
    required(s.clave, { message: 'Escribe la contraseña nueva.' });
    validate(s.clave, ({ value }) => (errorClave(value()) ? { kind: 'debil', message: errorClave(value()) } : undefined));
    validate(s.repetir, ({ value, valueOf }) => (value() !== valueOf(s.clave) ? { kind: 'distinta', message: 'Las contraseñas no coinciden.' } : undefined));
  });
  readonly mostrar = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      this.error.set('');
      try {
        await firstValueFrom(this.auth.restablecer(this.token() ?? '', this.modelo().clave));
        this.router.navigate(['/auth/login'], { queryParams: { aviso: 'clave' } });
      } catch (e) {
        this.error.set(mensajeError(e));
        this.guardando.set(false);
      }
    });
  }
}
