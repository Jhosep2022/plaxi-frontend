import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';

// Layout de las pantallas con sesión dentro de un espacio: sidebar + contenido
@Component({
  selector: 'app-app-layout',
  imports: [SidebarComponent, RouterOutlet],
  styles: `
    :host { display: flex; height: 100vh; }
    .main { flex: 1; min-width: 0; overflow-y: auto; }
  `,
  template: `
    <app-sidebar />
    <main id="app" class="main">
      <router-outlet />
    </main>
  `,
})
export class AppLayoutComponent {}
