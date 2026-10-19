import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { routes } from './app.routes';

// Configuración global de la app (reemplaza a app.module.ts y app-routing.module.ts)
// La app es zoneless (por defecto en Angular 22): la vista se actualiza cuando cambia
// un signal leído en la plantilla, un evento del template o una navegación; no usa zone.js.
export const appConfig: ApplicationConfig = {
  providers: [
    // Reporta errores no capturados (sin zone.js no se interceptan automáticamente)
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // withXhr: mantiene el backend XHR, necesario para el progreso de subida de archivos
    provideHttpClient(withXhr()),
  ],
};
