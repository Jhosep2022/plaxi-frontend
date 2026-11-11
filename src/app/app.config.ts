import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouteReuseStrategy, TitleStrategy, provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideSignalFormsConfig } from '@angular/forms/signals';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import AuraBase from '@primeuix/themes/aura/base';
import AuraToast from '@primeuix/themes/aura/toast';

import { routes } from './app.routes';
import { AulixTitleStrategy, RecrearConParametrosStrategy } from './core/routing/router-strategies';
import { apiAuthInterceptor } from './core/api/api-auth.interceptor';
import { SessionService } from './core/auth/session.service';

// Configuración global de la app (reemplaza a app.module.ts y app-routing.module.ts)
// La app es zoneless (por defecto en Angular 22): la vista se actualiza cuando cambia
// un signal leído en la plantilla, un evento del template o una navegación; no usa zone.js.
export const appConfig: ApplicationConfig = {
  providers: [
    // Reporta errores no capturados (sin zone.js no se interceptan automáticamente)
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => firstValueFrom(inject(SessionService).restoreSession())),
    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: { ...AuraBase, components: { toast: AuraToast } }, options: { darkModeSelector: false } } }),
    MessageService,
    // Every field the person already touched and is invalid gets a red border (.ui-invalido in ui.css)
    provideSignalFormsConfig({ classes: { 'ui-invalido': (field) => field.state().invalid() && field.state().touched() } }),
    provideRouter(
      routes,
      // Los parámetros de la ruta (:cursoId, :leccionId…) llegan como input() del componente
      withComponentInputBinding(),
      // Las rutas hijas también reciben los parámetros de sus padres
      withRouterConfig({ paramsInheritanceStrategy: 'always' })
    ),
    { provide: TitleStrategy, useClass: AulixTitleStrategy },
    { provide: RouteReuseStrategy, useClass: RecrearConParametrosStrategy },
    // withXhr: mantiene el backend XHR, necesario para el progreso de subida de archivos
    provideHttpClient(withXhr(), withInterceptors([apiAuthInterceptor])),
  ],
};
