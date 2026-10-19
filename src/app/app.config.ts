import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { routes } from './app.routes';

// Configuración global de la app (reemplaza a app.module.ts y app-routing.module.ts)
export const appConfig: ApplicationConfig = {
  providers: [
    // La app sigue usando zone.js para detectar cambios (Angular 22 es zoneless por defecto)
    provideZoneChangeDetection(),
    provideRouter(routes),
    // withXhr: mantiene el backend XHR, necesario para el progreso de subida de archivos
    provideHttpClient(withXhr()),
  ],
};
