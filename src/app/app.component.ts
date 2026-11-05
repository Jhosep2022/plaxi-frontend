import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

// Raíz de la app: cada grupo de rutas decide su propio layout
// (autenticación sin sidebar, espacios con AppLayoutComponent)
@Component({
    selector: 'app-root',
    template: '@defer (on immediate) { <p-toast position="top-right" /> }<router-outlet />',
    styles: ':host { display: block; height: 100vh; }',
    imports: [RouterOutlet, Toast]
})
export class AppComponent {}
