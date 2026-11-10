import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { SessionService } from './core/auth/session.service';

// Raíz de la app: cada grupo de rutas decide su propio layout
// (autenticación sin sidebar, espacios con AppLayoutComponent)
@Component({
    selector: 'app-root',
    template: '@defer (on immediate) { <p-toast position="top-right" /> }<router-outlet />',
    styles: ':host { display: block; height: 100vh; }',
    imports: [RouterOutlet, Toast]
})
export class AppComponent {
  private readonly session = inject(SessionService);

  @HostListener('window:focus')
  onFocus(): void {
    this.session.checkSessionOnFocus();
  }
}
