import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideRepositories } from './core/core.providers';

/**
 * Configuración raíz. `provideRepositories()` decide en un único punto si la
 * app habla con Supabase o con los repositorios demo en memoria.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    ...provideRepositories(),
  ],
};
