import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChartLine, faChalkboardTeacher, faClockRotateLeft, faHardDrive, faInbox, faSchool, faSignOutAlt, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';

const NAV_LINKS = [
  { path: 'overview', label: 'Resumen', icon: faChartLine },
  { path: 'schools', label: 'Colegios', icon: faSchool },
  { path: 'academies', label: 'Academias', icon: faChalkboardTeacher },
  { path: 'requests', label: 'Solicitudes', icon: faInbox },
  { path: 'users', label: 'Usuarios', icon: faUsers },
  { path: 'storage', label: 'Almacenamiento', icon: faHardDrive },
  { path: 'audit', label: 'Registro de acciones', icon: faClockRotateLeft },
];

@Component({
  selector: 'app-admin-layout', imports: [RouterLink, RouterLinkActive, RouterOutlet, FaIconComponent],
  template: `
    <aside class="admin-navigation">
      <nav class="rail" aria-label="Áreas de administración">
        <a routerLink="/admin/overview" class="brand" title="Aulix"><img src="assets/aulix-icon-light.svg" alt="Aulix" /></a>
        @for (link of links; track link.path) {
          <a class="rail-link" [routerLink]="['/admin', link.path]" routerLinkActive="active" [attr.aria-label]="link.label" [title]="link.label"><fa-icon [icon]="link.icon" /></a>
        }
        <button type="button" class="rail-link sign-out" aria-label="Cerrar sesión" title="Cerrar sesión" (click)="session.signOut()"><fa-icon [icon]="signOutIcon" /></button>
      </nav>
      <nav class="panel" aria-label="Administración de la plataforma">
        <div class="panel-title"><strong>Plataforma</strong><small>Administración</small></div>
        @for (link of links; track link.path) {
          <a [routerLink]="['/admin', link.path]" routerLinkActive="active"><fa-icon [icon]="link.icon" />{{ link.label }}</a>
        }
      </nav>
    </aside>
    <main><router-outlet /></main>
  `,
  styleUrl: './admin.css',
})
export class AdminLayoutComponent {
  protected readonly session = inject(SessionService);
  protected readonly links = NAV_LINKS;
  protected readonly signOutIcon = faSignOutAlt;
}
