
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import {
  provideRouter
} from '@angular/router';

import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { routes } from './app.routes';

import {
  superAdminAuthInterceptor
} from './core/auth/super-admin-auth.interceptor';

// ============================================
// CONFIGURACION PRINCIPAL DE ANGULAR
// SEBAS COLLECTION SAAS V2
// ============================================

export const appConfig: ApplicationConfig = {

  providers: [

    // Manejo global de errores
    provideBrowserGlobalErrorListeners(),

    // Rutas de Angular
    provideRouter(routes),

    // HTTP CLIENT + INTERCEPTOR JWT
    provideHttpClient(
      withInterceptors([
        superAdminAuthInterceptor
      ])
    )

  ]

};
