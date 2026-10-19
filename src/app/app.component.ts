import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { SidebarComponent } from './components/sidebar/sidebar.component';

// Rutas donde no se muestra el sidebar (pantallas de autenticación)
const RUTAS_SIN_SIDEBAR = ['/login', '/registrar', '/forgot-password'];

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    imports: [SidebarComponent, RouterOutlet]
})
export class AppComponent {
  private router = inject(Router);

  // URL actual como signal, actualizada en cada navegación
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly showSidebar = computed(() => !RUTAS_SIN_SIDEBAR.some((ruta) => this.url().includes(ruta)));
}
