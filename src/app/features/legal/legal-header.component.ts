import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

// Logo and links between the two legal texts
@Component({
  selector: 'app-legal-header',
  imports: [RouterLink],
  template: `
    <header>
      <a routerLink="/" aria-label="Aulix, ir al inicio"><img src="assets/aulix-logo.svg" alt="Aulix" /></a>
      <nav aria-label="Textos legales">
        <a routerLink="/terminos" [attr.aria-current]="current() === 'terminos' ? 'page' : null">Términos de uso</a>
        <a routerLink="/privacidad" [attr.aria-current]="current() === 'privacidad' ? 'page' : null">Privacidad</a>
      </nav>
    </header>
  `,
  styles: `
    header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
    img { width: 120px; height: auto; display: block; }
    nav { display: flex; gap: 16px; font-size: .9rem; }
    nav a { color: inherit; }
    nav a[aria-current='page'] { font-weight: 700; text-decoration: none; }
  `,
})
export class LegalHeaderComponent {
  readonly current = input.required<'terminos' | 'privacidad'>();
}
