import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { SessionService } from '../../core/auth/session.service';
import { TERMS_DATE_LABEL, TERMS_VERSION } from './legal-version';

// T07: before using Aulix, each account accepts the current terms of use and privacy policy.
// The acceptance is recorded with its date and version. A parent also authorizes the use of their children's data.
@Component({
  selector: 'app-accept-terms',
  styleUrls: ['../auth/auth.css'],
  template: `
    <main class="accept-terms">
      <img src="assets/aulix-logo.svg" alt="Aulix" width="120" />
      <h1>Antes de empezar</h1>
      <p>Lee cómo funciona Aulix y cómo cuidamos tus datos. Los textos se abren en otra pestaña.</p>
      <ul class="documentos">
        <li><a href="/terminos" target="_blank" rel="noopener">Términos de uso</a></li>
        <li><a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a></li>
      </ul>
      <p class="version">Versión del {{ date }}</p>

      <form class="ui-form" (submit)="$event.preventDefault(); accept()" novalidate>
        <label class="terminos">
          <input type="checkbox" [checked]="acceptsTerms()" (change)="acceptsTerms.set($any($event.target).checked)" />
          <span>Leí y acepto los términos de uso y la política de privacidad.</span>
        </label>
        @if (isParent()) {
          <label class="terminos">
            <input type="checkbox" [checked]="acceptsChildren()" (change)="acceptsChildren.set($any($event.target).checked)" />
            <span>Como padre, madre o tutor, autorizo que el colegio use los datos de mis hijos en Aulix como dice la política de privacidad.</span>
          </label>
        }
        @if (error()) { <p class="error-general" role="alert">{{ error() }}</p> }
        <button type="submit" class="ui-btn boton-ancho" [disabled]="!canAccept() || isSubmitting()">{{ isSubmitting() ? 'Guardando…' : 'Aceptar y continuar' }}</button>
        <button type="button" class="ui-btn ui-btn--secundario boton-ancho" (click)="session.signOut()">Salir</button>
      </form>
    </main>
  `,
  styles: `
    .accept-terms { max-width: 460px; margin: 8vh auto; padding: 24px 16px; box-sizing: border-box; }
    .accept-terms img { display: block; height: auto; margin-bottom: 24px; }
    .documentos { margin: 12px 0 4px; padding-left: 20px; line-height: 1.8; }
    .version { font-size: .85rem; opacity: .7; margin: 0 0 20px; }
    .terminos { display: flex; gap: 10px; align-items: flex-start; line-height: 1.5; cursor: pointer; }
    .terminos input { margin-top: 4px; flex: none; }
    form { display: grid; gap: 14px; }
  `,
})
export class AcceptTermsComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);

  readonly date = TERMS_DATE_LABEL;
  readonly isParent = computed(() => this.session.memberships().some((m) => m.rol === 'padre'));
  readonly acceptsTerms = signal(false);
  readonly acceptsChildren = signal(false);
  readonly canAccept = computed(() => this.acceptsTerms() && (!this.isParent() || this.acceptsChildren()));
  readonly error = signal('');
  readonly isSubmitting = signal(false);

  async accept(): Promise<void> {
    if (!this.canAccept() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.auth.acceptTerms(TERMS_VERSION));
      this.session.finishTermsAcceptance();
      await this.router.navigateByUrl(this.session.postLoginRoute());
    } catch (error) {
      this.error.set(readApiError(error).message);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
