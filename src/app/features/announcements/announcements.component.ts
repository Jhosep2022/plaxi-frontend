import { Component, inject, signal } from '@angular/core';
import { SessionService } from '../../core/auth/session.service';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { InboxComponent } from './inbox.component';
import { SentComponent } from './sent.component';

// Show the appropriate inbox and sent announcements for each role.
@Component({
  selector: 'app-announcements',
  host: { class: 'ui-pagina' },
  imports: [PageHeaderComponent, InboxComponent, SentComponent],
  template: `
    <app-page-header [miga]="role === 'direccion' ? 'Comunicación' : 'Seguimiento'" titulo="Comunicados" [descripcion]="description">
      @if (role === 'docente') {
        <div class="ui-tabs" role="tablist">
          <button type="button" role="tab" class="ui-tab" [class.activa]="selectedTab() === 'recibidos'" (click)="selectedTab.set('recibidos')">Recibidos</button>
          <button type="button" role="tab" class="ui-tab" [class.activa]="selectedTab() === 'enviados'" (click)="selectedTab.set('enviados')">Enviados</button>
        </div>
      }
    </app-page-header>

    @if (role === 'direccion' || (role === 'docente' && selectedTab() === 'enviados')) {
      <app-sent-announcements [esDireccion]="role === 'direccion'" />
    } @else {
      <app-announcements-inbox />
    }
  `,
})
export class AnnouncementsComponent {
  readonly role = inject(SessionService).activeRole();
  readonly selectedTab = signal<'recibidos' | 'enviados'>('recibidos');

  readonly description = {
    direccion: 'Envía avisos a padres, estudiantes y docentes, y revisa quién los leyó.',
    docente: 'Avisos de la dirección y los que envías a las familias de tus cursos.',
    padre: 'Avisos de la dirección y de los docentes de tus hijos.',
    estudiante: 'Avisos de la dirección y de tus docentes.',
  }[this.role ?? 'estudiante'];
}
