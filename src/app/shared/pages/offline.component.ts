import { Component, DestroyRef, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlugCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { ConnectivityService } from '../../core/api/connectivity.service';
import { safeReturnUrl } from './status-return';

// HU-ERR-05: a page could not open because there is no connection. It goes back on its own when the signal returns.
@Component({
  selector: 'app-offline',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <main class="status-page" aria-labelledby="status-title">
      <header class="status-header"><a routerLink="/" aria-label="Aulix, ir al inicio"><img src="assets/aulix-logo.svg" alt="Aulix" /></a></header>
      <div class="status-grid">
        <div class="status-art" aria-hidden="true"><span class="status-symbol status-symbol--solo"><fa-icon [icon]="faPlugCircleXmark" /></span></div>
        <section class="status-copy">
          <span class="status-label">Sin conexión</span>
          <h1 id="status-title">Parece que se cortó la señal.</h1>
          <p>No pudimos abrir esta página porque no hay conexión. Cuando vuelva, te llevamos solos de regreso; también puedes intentarlo ahora.</p>
          <div class="status-actions">
            <button type="button" class="button" [disabled]="connectivity.checking()" (click)="reintentar()">
              {{ connectivity.checking() ? 'Probando…' : 'Reintentar' }}
            </button>
            <a routerLink="/" class="text-link">Ir a mi inicio</a>
          </div>
        </section>
      </div>
      <footer class="status-footer">Aulix <span>·</span> Tu espacio para aprender y enseñar</footer>
    </main>
  `,
})
export class OfflineComponent {
  private readonly router = inject(Router);
  protected readonly connectivity = inject(ConnectivityService);
  readonly faPlugCircleXmark = faPlugCircleXmark;
  readonly volver = input<string>();
  readonly volverA = computed(() => safeReturnUrl(this.volver()) ?? '/');

  constructor() {
    // When the device is back online, return to the page that could not open
    if (typeof window === 'undefined') return;
    window.addEventListener('online', this.alVolver);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('online', this.alVolver));
  }

  private readonly alVolver = () => void this.reintentar();

  async reintentar(): Promise<void> {
    if (await this.connectivity.check()) void this.router.navigateByUrl(this.volverA());
  }
}
