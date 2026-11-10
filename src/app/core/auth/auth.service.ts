import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AUTH_ENDPOINTS } from '../config/auth.config';

export interface UsuarioSesion {
  id?: number;
  correo?: string;
  nombre?: string;
  rol: string;
}

interface RespuestaLogin {
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly token = signal<string | null>(null);
  private readonly usuarioInterno = signal<UsuarioSesion | null>(null);

  readonly usuario = this.usuarioInterno.asReadonly();

  readonly autenticado = computed(
    () =>
      this.token() !== null &&
      this.usuarioInterno()?.rol === 'SUPER_ADMIN'
  );

  iniciarSesion(
    correo: string,
    password: string
  ): Observable<void> {
    const { login, perfil } = AUTH_ENDPOINTS;

    if (!login || !perfil) {
      return throwError(
        () => new Error(
          'La autenticación todavía no está conectada con Spring Boot.'
        )
      );
    }

    if (
      !login.startsWith('/') ||
      login.startsWith('//') ||
      !perfil.startsWith('/') ||
      perfil.startsWith('//')
    ) {
      return throwError(
        () => new Error('Configuración de rutas de autenticación inválida.')
      );
    }

    this.cerrarSesion();

    // El cuerpo y la respuesta se adaptarán al contrato real.
    return this.http.post<RespuestaLogin>(
      `${API_BASE_URL}${login}`,
      { correo, password }
    ).pipe(
      switchMap(respuesta => {
        if (
          typeof respuesta?.token !== 'string' ||
          !respuesta.token.trim()
        ) {
          return throwError(
            () => new Error(
              'El backend no devolvió un token válido.'
            )
          );
        }

        const headers = new HttpHeaders({
          Authorization: `Bearer ${respuesta.token}`
        });

        return this.http.get<UsuarioSesion>(
          `${API_BASE_URL}${perfil}`,
          { headers }
        ).pipe(
          map(usuario => ({
            token: respuesta.token,
            usuario
          }))
        );
      }),

      map(({ token, usuario }) => {
        if (usuario?.rol !== 'SUPER_ADMIN') {
          throw new Error(
            'Tu usuario no tiene permisos de superadministrador.'
          );
        }

        this.token.set(token);
        this.usuarioInterno.set(usuario);
      })
    );
  }

  obtenerToken(): string | null {
    return this.token();
  }

  cerrarSesion(): void {
    this.token.set(null);
    this.usuarioInterno.set(null);
  }
}