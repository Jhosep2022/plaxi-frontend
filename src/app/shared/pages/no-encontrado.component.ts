import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCompass } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink, FaIconComponent],
  styleUrls: ['./estado-pagina.css'],
  template: `
    <div class="estado">
      <div class="icono"><fa-icon [icon]="faCompass" /></div>
      <p class="codigo">ERROR 404</p>
      <h1>Página no encontrada</h1>
      <p>La dirección que buscas no existe o ya no está disponible.</p>
      <a routerLink="/" class="boton">Volver al inicio</a>
    </div>
  `,
})
export class NoEncontradoComponent {
  readonly faCompass = faCompass;
}
