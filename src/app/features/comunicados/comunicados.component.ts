import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../core/auth/session.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { BandejaComponent } from './bandeja.component';
import { EnviadosComponent } from './enviados.component';

// Comunicados según el rol: la dirección gestiona los enviados; el docente recibe y envía; padre y estudiante reciben
@Component({
  selector: 'app-comunicados',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, BandejaComponent, EnviadosComponent],
  template: `
    <app-page-header [miga]="rol === 'direccion' ? 'Comunicación' : 'Seguimiento'" titulo="Comunicados" [descripcion]="descripcion">
      @if (rol === 'docente') {
        <div class="ui-tabs" role="tablist">
          <button type="button" role="tab" class="ui-tab" [class.activa]="pestana() === 'recibidos'" (click)="pestana.set('recibidos')">Recibidos</button>
          <button type="button" role="tab" class="ui-tab" [class.activa]="pestana() === 'enviados'" (click)="pestana.set('enviados')">Enviados</button>
        </div>
      }
    </app-page-header>

    @if (rol === 'direccion' || (rol === 'docente' && pestana() === 'enviados')) {
      <app-comunicados-enviados [esDireccion]="rol === 'direccion'" />
    } @else {
      <app-bandeja-comunicados />
    }
  `,
})
export class ComunicadosComponent {
  readonly rol = inject(SessionService).rolActivo();
  readonly pestana = signal<'recibidos' | 'enviados'>('recibidos');

  readonly descripcion = {
    direccion: 'Envía avisos a padres, estudiantes y docentes, y revisa quién los leyó.',
    docente: 'Avisos de la dirección y los que envías a las familias de tus cursos.',
    padre: 'Avisos de la dirección y de los docentes de tus hijos.',
    estudiante: 'Avisos de la dirección y de tus docentes.',
  }[this.rol ?? 'estudiante'];
}
