import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { provideRepositories } from './core/core.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideTranslateService({ fallbackLang: 'es' }),
    ...provideTranslateHttpLoader(),
    ...provideRepositories(),
    provideServiceWorker('ngsw-worker.js', {
      // El SW solo se activa en producción; en dev se desactiva para no
      // interferir con el hot-reload ni los cambios frecuentes de assets.
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};

