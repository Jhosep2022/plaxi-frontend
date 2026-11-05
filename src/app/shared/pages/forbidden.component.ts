import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./status-page.css'],
  template: `
    <div class="status">
      <div class="icon"><fa-icon [icon]="faLock" /></div>
      <p class="code">ERROR 403</p>
      <h1>No tienes acceso</h1>
      <p>Esta sección pertenece a otro rol o a un espacio del que no formas parte.</p>
      <a routerLink="/" class="button">Ir a mi inicio</a>
    </div>
  `,
})
export class ForbiddenComponent {
  readonly faLock = faLock;
}
