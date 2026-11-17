import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowUpRightFromSquare,
  faCheck,
  faEye,
  faFileContract,
  faSchool,
  faShieldHalved,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { AuthApiService } from '../../core/api/auth-api.service';
import { readApiError } from '../../core/api/api-error';
import { SessionService } from '../../core/auth/session.service';
import { TERMS_DATE_LABEL, TERMS_VERSION } from './legal-version';

// T07: before using Aulix, each account accepts the current terms of use and privacy policy.
// The acceptance is recorded with its date and version. A parent also authorizes the use of their children's data.
// It is shown inside the sign-in layout (brand panel on the left), like the other access screens.
@Component({
  selector: 'app-accept-terms',
  imports: [FaIconComponent],
  styleUrls: ['../auth/auth.css'],
  template: `
    <div class="encabezado">
      <span class="paso">Un paso más</span>
      <h1>Antes de empezar</h1>
      <p>Revisa cómo funciona Aulix y cómo cuidamos tus datos. Solo te lo pedimos una vez.</p>
    </div>

    <ul class="claves">
      <li><span class="icono"><fa-icon [icon]="faSchool" /></span><span>Tus datos son de tu colegio. <strong>No los vendemos</strong> ni los usamos para publicidad.</span></li>
      <li><span class="icono"><fa-icon [icon]="faEye" /></span><span>Cada persona ve solo lo suyo: un padre, a sus hijos; un docente, sus cursos.</span></li>
      <li><span class="icono"><fa-icon [icon]="faShieldHalved" /></span><span>Puedes ver y corregir tus datos, o pedir una copia o que se borren.</span></li>
    </ul>

    <div class="documentos">
      <a href="/terminos" target="_blank" rel="noopener" class="documento">
        <span class="icono"><fa-icon [icon]="faFileContract" /></span>
        <span class="texto"><strong>Términos de uso</strong><small>Cómo usar Aulix</small></span>
        <fa-icon class="abrir" [icon]="faArrowUpRightFromSquare" />
      </a>
      <a href="/privacidad" target="_blank" rel="noopener" class="documento">
        <span class="icono"><fa-icon [icon]="faUserShield" /></span>
        <span class="texto"><strong>Privacidad</strong><small>Qué datos guardamos</small></span>
        <fa-icon class="abrir" [icon]="faArrowUpRightFromSquare" />
      </a>
    </div>

    <form class="ui-form" (submit)="$event.preventDefault(); accept()" novalidate>
      <label class="opcion" [class.marcada]="acceptsTerms()">
        <input type="checkbox" class="oculta" [checked]="acceptsTerms()" (change)="acceptsTerms.set($any($event.target).checked)" />
        <span class="check" aria-hidden="true">@if (acceptsTerms()) { <fa-icon [icon]="faCheck" /> }</span>
        <span>Leí y acepto los <strong>términos de uso</strong> y la <strong>política de privacidad</strong>.</span>
      </label>
      @if (isParent()) {
        <label class="opcion" [class.marcada]="acceptsChildren()">
          <input type="checkbox" class="oculta" [checked]="acceptsChildren()" (change)="acceptsChildren.set($any($event.target).checked)" />
          <span class="check" aria-hidden="true">@if (acceptsChildren()) { <fa-icon [icon]="faCheck" /> }</span>
          <span>Como padre, madre o tutor, autorizo que el colegio use los datos de mis hijos en Aulix, como dice la política de privacidad.</span>
        </label>
      }
      @if (error()) { <p class="error-general" role="alert">{{ error() }}</p> }
      <button type="submit" class="ui-btn boton-ancho" [disabled]="!canAccept() || isSubmitting()">{{ isSubmitting() ? 'Guardando…' : 'Aceptar y continuar' }}</button>
      <p class="pie-form">
        <span>Versión del {{ date }}</span>
        <button type="button" class="salir" (click)="session.signOut()">No soy yo, salir</button>
      </p>
    </form>
  `,
  styles: `
    .paso { display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; background: var(--lime-soft); color: var(--lime-strong); font-size: 12px; font-weight: bold; }

    .icono { width: 34px; height: 34px; display: grid; place-items: center; flex-shrink: 0; border-radius: 10px; background: var(--lime-soft); color: var(--lime-strong); }

    .claves { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 16px; list-style: none; border-radius: 16px; background: var(--cream-soft); }
    .claves li { display: flex; align-items: center; gap: 12px; font-size: 14px; line-height: 1.45; color: var(--dark-blue); }
    .claves .icono { background: var(--light-cream); color: var(--cream-strong); }

    .documentos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .documento { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: #fff; color: var(--dark-blue); text-decoration: none; transition: border-color .15s, box-shadow .15s; }
    .documento:hover { border-color: var(--lime-green); box-shadow: 0 4px 14px rgba(10, 10, 35, .06); }
    .documento .texto { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .documento strong { font-size: 14px; }
    .documento small { font-size: 12px; color: var(--muted); }
    .documento .abrir { color: var(--muted); font-size: 12px; }

    .opcion { display: flex; align-items: flex-start; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: #fff; font-size: 14px; line-height: 1.45; cursor: pointer; transition: border-color .15s, background .15s; }
    .opcion:hover { border-color: var(--lime-green); }
    .opcion.marcada { border-color: var(--lime-green); background: var(--lime-soft); }
    .opcion:has(.oculta:focus-visible) { outline: 2px solid var(--dark-blue); outline-offset: 2px; }
    .oculta { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
    .check { width: 20px; height: 20px; display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; border: 2px solid #c9c9d6; border-radius: 6px; background: #fff; color: var(--dark-blue); font-size: 11px; }
    .marcada .check { border-color: var(--lime-green); background: var(--lime-green); }

    .pie-form { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 0; font-size: 13px; color: var(--muted); }
    .salir { border: none; background: none; padding: 0; color: var(--muted); font: inherit; font-weight: bold; cursor: pointer; }
    .salir:hover { color: var(--dark-blue); text-decoration: underline; }

    @media (max-width: 420px) {
      .documentos { grid-template-columns: 1fr; }
      .pie-form { flex-direction: column-reverse; }
    }
  `,
})
export class AcceptTermsComponent {
  private readonly auth = inject(AuthApiService);
  private readonly router = inject(Router);
  readonly session = inject(SessionService);

  readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
  readonly faCheck = faCheck;
  readonly faEye = faEye;
  readonly faFileContract = faFileContract;
  readonly faSchool = faSchool;
  readonly faShieldHalved = faShieldHalved;
  readonly faUserShield = faUserShield;

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
