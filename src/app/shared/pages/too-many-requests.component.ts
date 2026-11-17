import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { formatWait } from '../../core/api/api-error';
import { safeReturnUrl } from './status-return';

// HU-ERR-05: too many requests in a short time. Shows how long to wait and enables "Reintentar" when it is over.
@Component({
  selector: 'app-too-many-requests',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <main class="status-page" aria-labelledby="status-title">
      <header class="status-header"><a routerLink="/" aria-label="Aulix, ir al inicio"><img src="assets/aulix-logo.svg" alt="Aulix" /></a></header>
      <div class="status-grid">
        <div class="status-art" aria-hidden="true"><span class="status-number">429</span><span class="status-symbol"><fa-icon [icon]="faHourglassHalf" /></span></div>
        <section class="status-copy">
          <span class="status-label">Demasiados intentos</span>
          <h1 id="status-title">Vamos un poco más despacio.</h1>
          <p>
            Hubo muchos pedidos seguidos y pausamos un momento para cuidar tu cuenta.
            @if (restante() > 0) { Podrás seguir en <strong>{{ espera() }}</strong>. } @else { Ya puedes volver a intentarlo. }
          </p>
          <div class="status-actions">
            <button type="button" class="button" [disabled]="restante() > 0" (click)="reintentar()">Reintentar</button>
            <a routerLink="/" class="text-link">Ir a mi inicio</a>
          </div>
        </section>
      </div>
      <footer class="status-footer">Aulix <span>·</span> Tu espacio para aprender y enseñar</footer>
    </main>
  `,
})
export class TooManyRequestsComponent {
  private readonly router = inject(Router);
  readonly faHourglassHalf = faHourglassHalf;
  readonly volver = input<string>();
  readonly segundos = input<string>(); // ?segundos=60 from the Retry-After header
  readonly volverA = computed(() => safeReturnUrl(this.volver()) ?? '/');

  private readonly inicio = Date.now();
  private readonly ahora = signal(Date.now());
  readonly restante = computed(() => {
    const total = Number(this.segundos()) || 0;
    return Math.max(0, Math.ceil(total - (this.ahora() - this.inicio) / 1000));
  });
  readonly espera = computed(() => formatWait(this.restante()));

  constructor() {
    const reloj = setInterval(() => this.ahora.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(reloj));
  }

  reintentar(): void {
    void this.router.navigateByUrl(this.volverA());
  }
}
