
import { inject } from '@angular/core';

import {
  HttpInterceptorFn
} from '@angular/common/http';

import { AuthService } from './auth.service';

// ============================================
// INTERCEPTOR JWT - SUPER ADMIN SAAS
// ============================================

export const superAdminAuthInterceptor: HttpInterceptorFn =
  (request, next) => {

    // Solo interceptar endpoints protegidos
    // del Superadministrador.
    //
    // No enviar el JWT a servicios externos.

    const esRutaSuperAdmin =
      request.url.startsWith('/api/superadmin/');

    if (!esRutaSuperAdmin) {
      return next(request);
    }

    // Respetar un Authorization existente.

    if (request.headers.has('Authorization')) {
      return next(request);
    }

    // Obtener el JWT de la sesión actual.

    const authService = inject(AuthService);

    const token = authService.obtenerToken();

    // Si no existe sesión, no inventar un token.
    // Spring Boot responderá según sus reglas.

    if (!token) {
      return next(request);
    }

    // Añadir Authorization: Bearer JWT

    const solicitudAutenticada = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(solicitudAutenticada);
  };
