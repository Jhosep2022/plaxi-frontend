import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCompass } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <div class="status">
      <div class="icon"><fa-icon [icon]="faCompass" /></div>
      <p class="code">ERROR 404</p>
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe o ya no está disponible.</p>
      <a routerLink="/" class="button">Volver al inicio</a>
    </div>
  `,
})
export class NotFoundComponent {
  readonly faCompass = faCompass;
}
