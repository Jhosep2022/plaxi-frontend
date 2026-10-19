import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { RouteReuseStrategy, TitleStrategy, provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';

import { routes } from './app.routes';
import { QuizWizTitleStrategy, RecrearConParametrosStrategy } from './core/routing/router-strategies';

// Configuración global de la app (reemplaza a app.module.ts y app-routing.module.ts)
// La app es zoneless (por defecto en Angular 22): la vista se actualiza cuando cambia
// un signal leído en la plantilla, un evento del template o una navegación; no usa zone.js.
export const appConfig: ApplicationConfig = {
  providers: [
    // Reporta errores no capturados (sin zone.js no se interceptan automáticamente)
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Los parámetros de la ruta (:cursoId, :leccionId…) llegan como input() del componente
      withComponentInputBinding(),
      // Las rutas hijas también reciben los parámetros de sus padres
      withRouterConfig({ paramsInheritanceStrategy: 'always' })
    ),
    { provide: TitleStrategy, useClass: QuizWizTitleStrategy },
    { provide: RouteReuseStrategy, useClass: RecrearConParametrosStrategy },
    // withXhr: mantiene el backend XHR, necesario para el progreso de subida de archivos
    provideHttpClient(withXhr()),
  ],
};
