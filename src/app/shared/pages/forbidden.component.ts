import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <main class="status-page" aria-labelledby="status-title">
      <header class="status-header"><a routerLink="/" aria-label="Aulix, ir al inicio"><img src="assets/aulix-logo.svg" alt="Aulix" /></a></header>
      <div class="status-grid">
        <div class="status-art" aria-hidden="true"><span class="status-number">403</span><span class="status-symbol"><fa-icon [icon]="faLock" /></span></div>
        <section class="status-copy">
          <span class="status-label">Acceso restringido</span>
          <h1 id="status-title">Esta sección tiene otra llave.</h1>
          <p>Tu cuenta no tiene permiso para abrir esta página. Puedes volver a tu inicio o elegir otro espacio al que pertenezcas.</p>
          <div class="status-actions">
            <a routerLink="/" class="button">Ir a mi inicio</a>
            @if (hasOtherSpaces()) { <a routerLink="/espacios" class="text-link">Elegir otro espacio</a> }
          </div>
        </section>
      </div>
      <footer class="status-footer">Aulix <span>·</span> Tu espacio para aprender y enseñar</footer>
    </main>
  `,
})
export class ForbiddenComponent {
  readonly faLock = faLock;
  private readonly session = inject(SessionService);
  readonly hasOtherSpaces = computed(() => new Set(this.session.memberships().map((m) => m.espacio.id)).size > 1);
}
