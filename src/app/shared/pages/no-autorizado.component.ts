import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-no-autorizado',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./estado-pagina.css'],
  template: `
    <div class="estado">
      <div class="icono"><fa-icon [icon]="faLock" /></div>
      <p class="codigo">ERROR 403</p>
      <h1>No tienes acceso</h1>
      <p>Esta sección pertenece a otro rol o a un espacio del que no formas parte.</p>
      <a routerLink="/" class="boton">Ir a mi inicio</a>
    </div>
  `,
})
export class NoAutorizadoComponent {
  readonly faLock = faLock;
}
