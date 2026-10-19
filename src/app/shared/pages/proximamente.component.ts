import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPersonDigging } from '@fortawesome/free-solid-svg-icons';

// Pantalla temporal para módulos planificados que aún no se construyen.
// "titulo" y "descripcion" llegan desde el `data` de la ruta.
@Component({
  selector: 'app-proximamente',
  imports: [FaIconComponent],
  styleUrls: ['./estado-pagina.css'],
  template: `
    <div class="estado">
      <div class="icono"><fa-icon [icon]="faPersonDigging" /></div>
      <p class="codigo">PRÓXIMAMENTE</p>
      <h1>{{ titulo() }}</h1>
      <p>{{ descripcion() }}</p>
    </div>
  `,
})
export class ProximamenteComponent {
  readonly faPersonDigging = faPersonDigging;
  readonly titulo = input('Módulo en construcción');
  readonly descripcion = input('Estamos trabajando en esta sección. Muy pronto estará disponible.');
}
