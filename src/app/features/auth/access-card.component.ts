import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash, faLinkSlash } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom, of } from 'rxjs';
import { AuthApiService, type AccessCardStatus } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { SessionService } from '../../core/auth/session.service';
import { getPasswordError } from '../../core/utils/password';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';

// Opened by the QR of an access card. A student only creates a password; a parent first sees the children
// the school linked to them and confirms with their CI. The card works once.
@Component({
  selector: 'app-access-card',
  imports: [FormField, RouterLink, FaIconComponent, PasswordStrengthComponent],
  styleUrls: ['./auth.css'],
  template: `
    @if (card.isLoading()) {
      <p class="ui-ayuda">Revisando tu tarjeta…</p>
    } @else if (!card.value()?.valido) {
      <div class="exito">
        <span class="icono invalid-token"><fa-icon [icon]="faLinkSlash" /></span>
        <h1>Esta tarjeta ya no sirve</h1>
        <p>Puede que ya la hayas usado, que haya vencido o que el colegio haya impreso una nueva. Pide una tarjeta nueva en secretaría.</p>
      </div>
      <a class="ui-btn boton-ancho" routerLink="/auth/login">Ir a iniciar sesión</a>
    } @else {
      @let c = card.value()!;
      <header class="encabezado">
        <h1>Hola, {{ c.nombre }}</h1>
        @if (c.pideCarnet) {
          <p>El colegio registró a tus hijos:</p>
        } @else {
          <p>Crea tu contraseña para entrar a Aulix. Tu usuario es <strong>{{ c.usuario }}</strong>.</p>
        }
      </header>
      @if (c.pideCarnet && c.hijos?.length) {
        <ul class="hijos">
          @for (h of c.hijos; track $index) {
            <li><strong>{{ h.nombre }}</strong>@if (h.paralelo) { <span> · {{ h.paralelo }}</span> }</li>
          }
        </ul>
        <p class="ui-ayuda">Si alguno no es tu hijo o falta uno, avisa en secretaría antes de seguir.</p>
      }
      <form class="ui-form" (submit)="$event.preventDefault(); activate()" novalidate>
        @if (c.pideCarnet) {
          <div class="ui-campo">
            <label for="tarjeta-ci">Tu carnet de identidad</label>
            <input id="tarjeta-ci" class="ui-input" inputmode="numeric" autocomplete="off" placeholder="El mismo que diste al colegio" [formField]="cardForm.ci" />
            @if (cardForm.ci().touched() && cardForm.ci().invalid()) { <span class="ui-error">{{ cardForm.ci().errors()[0].message }}</span> }
          </div>
        }
        <div class="ui-campo">
          <label for="tarjeta-clave">Crea una contraseña</label>
          <div class="campo-clave">
            <input id="tarjeta-clave" [type]="showPassword() ? 'text' : 'password'" class="ui-input" autocomplete="new-password" [formField]="cardForm.password" />
            <button type="button" class="ver-clave" (click)="showPassword.update((v) => !v)" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showPassword()"><fa-icon [icon]="showPassword() ? faEyeSlash : faEye" /></button>
          </div>
          @if (cardForm.password().touched() && cardForm.password().invalid()) { <span class="ui-error">{{ cardForm.password().errors()[0].message }}</span> }
        </div>
        <div class="ui-campo">
          <label for="tarjeta-repetir">Repite la contraseña</label>
          <div class="campo-clave">
            <input id="tarjeta-repetir" [type]="showConfirmation() ? 'text' : 'password'" class="ui-input" autocomplete="new-password" [formField]="cardForm.confirmation" />
            <button type="button" class="ver-clave" (click)="showConfirmation.update((v) => !v)" [attr.aria-label]="showConfirmation() ? 'Ocultar confirmación' : 'Mostrar confirmación'" [attr.aria-pressed]="showConfirmation()"><fa-icon [icon]="showConfirmation() ? faEyeSlash : faEye" /></button>
          </div>
          @if (cardForm.confirmation().touched() && cardForm.confirmation().invalid()) { <span class="ui-error">{{ cardForm.confirmation().errors()[0].message }}</span> }
        </div>
        <app-password-strength [password]="details().password" />
        @if (error()) { <p class="error-general" role="alert">{{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="isSubmitting()">{{ isSubmitting() ? 'Entrando…' : 'Entrar a Aulix' }}</button>
      </form>
    }
  `,
  styles: `
    .icono.invalid-token { background: #fdf0ee; color: #c0392b; }
    .hijos { display: grid; gap: 8px; margin: 0 0 8px; padding: 0; list-style: none; }
    .hijos li { padding: 12px 14px; border-radius: 12px; background: var(--page-bg); }
    .hijos span { color: var(--muted); }
  `,
})
export class AccessCardComponent {
  readonly faEye = faEye;
  readonly faEyeSlash = faEyeSlash;
  readonly faLinkSlash = faLinkSlash;
  private readonly auth = inject(AuthApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly token = input<string>();
  readonly card = rxResource({
    params: () => this.token(),
    stream: ({ params }) => (params ? this.auth.getAccessCardStatus(params) : of<AccessCardStatus>({ valido: false })),
  });
  private readonly asksForCi = computed(() => !!this.card.value()?.pideCarnet);

  readonly details = signal({ ci: '', password: '', confirmation: '' });
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly cardForm = form(this.details, (fields) => {
    validate(fields.ci, ({ value }) => (this.asksForCi() && !value().trim() ? { kind: 'required', message: 'Escribe tu carnet.' } : undefined));
    required(fields.password, { message: 'Crea una contraseña.' });
    validate(fields.password, ({ value }) => (getPasswordError(value()) ? { kind: 'weak', message: getPasswordError(value()) } : undefined));
    validate(fields.confirmation, ({ value, valueOf }) => (value() !== valueOf(fields.password) ? { kind: 'mismatch', message: 'Las contraseñas no coinciden.' } : undefined));
  });
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  activate(): void {
    submit(this.cardForm, async () => {
      const token = this.token();
      if (!token) return;
      this.isSubmitting.set(true);
      this.error.set('');
      try {
        const { ci, password } = this.details();
        this.session.applyApiSession(await firstValueFrom(this.auth.activateWithAccessCard(token, password, this.asksForCi() ? ci : undefined)));
        await this.router.navigateByUrl(this.session.postLoginRoute());
      } catch (error) {
        this.error.set(readApiError(error).message);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }
}
