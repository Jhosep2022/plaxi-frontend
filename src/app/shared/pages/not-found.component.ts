import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCompass } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <main class="status-page" aria-labelledby="status-title">
      <header class="status-header"><a routerLink="/" aria-label="Aulix, ir al inicio"><img src="assets/aulix-logo.svg" alt="Aulix" /></a></header>
      <div class="status-grid">
        <div class="status-art" aria-hidden="true"><span class="status-number">404</span><span class="status-symbol"><fa-icon [icon]="faCompass" /></span></div>
        <section class="status-copy">
          <span class="status-label">Ruta no encontrada</span>
          <h1 id="status-title">Esta página se salió del mapa.</h1>
          <p>Puede que el enlace haya cambiado o que la dirección tenga un error. Vuelve al inicio para seguir desde allí.</p>
          <div class="status-actions"><a routerLink="/" class="button">Volver al inicio</a></div>
        </section>
      </div>
      <footer class="status-footer">Aulix <span>·</span> Tu espacio para aprender y enseñar</footer>
    </main>
  `,
})
export class NotFoundComponent {
  readonly faCompass = faCompass;
}
