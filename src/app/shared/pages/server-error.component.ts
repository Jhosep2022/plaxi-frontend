import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faServer } from '@fortawesome/free-solid-svg-icons';
import { safeReturnUrl } from './status-return';

// HU-ERR-03: the server failed while opening a page. Retry, go home, and a reference for support.
@Component({
  selector: 'app-server-error',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <main class="status-page" aria-labelledby="status-title">
      <header class="status-header"><a routerLink="/" aria-label="Aulix, ir al inicio"><img src="assets/aulix-logo.svg" alt="Aulix" /></a></header>
      <div class="status-grid">
        <div class="status-art" aria-hidden="true"><span class="status-number">500</span><span class="status-symbol"><fa-icon [icon]="faServer" /></span></div>
        <section class="status-copy">
          <span class="status-label">Problema en el servidor</span>
          <h1 id="status-title">Algo falló de nuestro lado.</h1>
          <p>No es nada que hayas hecho. Vuelve a intentarlo en un momento; si se repite, avísanos y lo revisamos.</p>
          @if (ref()) {
            <p class="status-ref">Referencia para soporte: <strong>{{ ref() }}</strong></p>
          }
          <div class="status-actions">
            @if (volverA()) { <button type="button" class="button" (click)="reintentar()">Reintentar</button> }
            <a routerLink="/" [class]="volverA() ? 'text-link' : 'button'">Ir a mi inicio</a>
          </div>
        </section>
      </div>
      <footer class="status-footer">Aulix <span>·</span> Tu espacio para aprender y enseñar</footer>
    </main>
  `,
})
export class ServerErrorComponent {
  private readonly router = inject(Router);
  readonly faServer = faServer;
  readonly volver = input<string>(); // query params, through withComponentInputBinding
  readonly ref = input<string>();
  readonly volverA = computed(() => safeReturnUrl(this.volver()));

  reintentar(): void {
    void this.router.navigateByUrl(this.volverA() ?? '/');
  }
}
