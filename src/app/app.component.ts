import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Raíz de la app: cada grupo de rutas decide su propio layout
// (autenticación sin sidebar, espacios con AppLayoutComponent)
@Component({
    selector: 'app-root',
    template: '<router-outlet />',
    styles: ':host { display: block; height: 100vh; }',
    imports: [RouterOutlet]
})
export class AppComponent {}
