import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { NavbarComponent } from './components/navbar/navbar.component';

// Rutas donde no se muestra el navbar
const RUTAS_SIN_NAVBAR = ['/login', '/registrar', '/forgot-password'];

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    imports: [NavbarComponent, RouterOutlet]
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

  readonly showNavbar = computed(() => !RUTAS_SIN_NAVBAR.some((ruta) => this.url().includes(ruta)));
}
