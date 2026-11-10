import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChalkboardTeacher, faChartLine, faClockRotateLeft, faHardDrive, faInbox, faSchool, faShieldHalved, faSignOutAlt, faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'primeng/tooltip';
import { SessionService } from '../../core/auth/session.service';

// Same structure as the space sidebar: icon rail + panel with sections and a highlighted card at the bottom
const SECTIONS = [
  {
    title: 'Espacios',
    links: [
      { path: 'overview', label: 'Resumen', icon: faChartLine },
      { path: 'schools', label: 'Colegios', icon: faSchool },
      { path: 'academies', label: 'Academias', icon: faChalkboardTeacher },
      { path: 'requests', label: 'Solicitudes', icon: faInbox },
    ],
  },
  { title: 'Cuentas', links: [{ path: 'users', label: 'Usuarios', icon: faUsers }] },
  {
    title: 'Operación',
    links: [
      { path: 'storage', label: 'Almacenamiento', icon: faHardDrive },
      { path: 'audit', label: 'Registro de acciones', icon: faClockRotateLeft },
    ],
  },
];

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FaIconComponent, Tooltip],
  template: `
    <aside class="admin-navigation">
      <nav class="rail" aria-label="Áreas de administración">
        <a routerLink="/admin/overview" class="brand" pTooltip="Aulix · Plataforma" tooltipPosition="right"><img src="assets/aulix-icon-light.svg" alt="Aulix" /></a>
        @for (link of links; track link.path) {
          <a class="rail-link" [routerLink]="['/admin', link.path]" routerLinkActive="active" [attr.aria-label]="link.label" [pTooltip]="link.label" tooltipPosition="right">
            <fa-icon [icon]="link.icon" />
          </a>
        }
        <button type="button" class="rail-link sign-out" aria-label="Cerrar sesión" pTooltip="Cerrar sesión" tooltipPosition="right" (click)="session.signOut()">
          <fa-icon [icon]="signOutIcon" />
        </button>
      </nav>
      <nav class="panel" aria-label="Administración de la plataforma">
        <div class="platform-card">
          <span class="platform-icon"><fa-icon [icon]="shieldIcon" /></span>
          <span class="platform-text"><strong>Aulix Plataforma</strong><small>Equipo Alclick · Superadmin</small></span>
        </div>
        <h2 class="panel-heading">Administración</h2>
        @for (section of sections; track section.title) {
          <section class="panel-section">
            <h3 class="section-title">{{ section.title }}</h3>
            @for (link of section.links; track link.path) {
              <a class="panel-link" [routerLink]="['/admin', link.path]" routerLinkActive="active"><fa-icon class="link-icon" [icon]="link.icon" />{{ link.label }}</a>
            }
          </section>
        }
        <div class="panel-card">
          <fa-icon class="card-icon" [icon]="inboxIcon" />
          <h4>Nuevos colegios</h4>
          <p>Revisa las solicitudes y crea el espacio con su cuenta de dirección.</p>
          <a class="card-btn" routerLink="/admin/requests">Ver solicitudes</a>
        </div>
      </nav>
    </aside>
    <main><router-outlet /></main>
  `,
  styleUrl: './admin.css',
})
export class AdminLayoutComponent {
  protected readonly session = inject(SessionService);
  protected readonly sections = SECTIONS;
  protected readonly links = SECTIONS.flatMap((section) => section.links);
  protected readonly signOutIcon = faSignOutAlt;
  protected readonly shieldIcon = faShieldHalved;
  protected readonly inboxIcon = faInbox;
}
