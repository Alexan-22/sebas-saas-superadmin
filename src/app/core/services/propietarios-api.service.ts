
import { Injectable, inject } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import {
  EstadoTienda
} from './tiendas-api.service';

// ==================================================
// SEBAS COLLECTION SAAS V2
// SERVICIO REAL DE PROPIETARIOS
//
// Angular -> Spring Boot -> Supabase
//
// Funcionalidades:
// - Listar propietarios
// - Consultar propietario de tienda
// - Buscar candidatos ADMIN
// - Crear propietario
// - Asignar propietario existente
// - Consultar cuenta
// - Editar cuenta
// - Activar acceso
// - Desactivar acceso
//
// La autenticación JWT se gestiona mediante
// el interceptor HTTP existente.
// ==================================================

// ==================================================
// 1. MODELO PRINCIPAL
// ==================================================

export interface PropietarioResumen {

  tiendaId: number;

  tiendaNombre: string;

  subdominio: string;

  estadoTienda: EstadoTienda;

  usuarioId: number | null;

  nombre: string | null;

  apellido: string | null;

  correo: string | null;

  activo: boolean | null;

  rol: string | null;

  asignadoEn: string | null;

}

// ==================================================
// 2. ADMINISTRADOR CANDIDATO
// ==================================================

export interface CandidatoPropietario {

  usuarioId: number;

  nombre: string;

  apellido: string;

  correo: string;

  asignado: boolean;

}

// ==================================================
// 3. REGISTRAR NUEVO PROPIETARIO
// ==================================================

export interface CrearPropietarioRequest {

  tiendaId: number;

  nombre: string;

  apellido: string;

  correo: string;

  contrasena: string;

}

// ==================================================
// 4. ASIGNAR ADMIN EXISTENTE
// ==================================================

export interface AsignarPropietarioRequest {

  usuarioId: number;

}

// ==================================================
// 5. RESPUESTA DE CUENTA
// ==================================================

export interface CuentaPropietarioResponse {

  tiendaId: number;

  usuarioId: number;

  nombre: string;

  apellido: string;

  correo: string;

  activo: boolean;

}

// ==================================================
// 6. SOLICITUD DE EDICIÓN
// ==================================================

export interface EditarCuentaPropietarioRequest {

  nombre: string;

  apellido: string;

  correo: string;

}

// ==================================================
// 7. SOLICITUD DE CAMBIO DE ESTADO
// ==================================================

export interface CambiarEstadoCuentaRequest {

  activo: boolean;

}

// ==================================================
// 8. SERVICIO ANGULAR
// ==================================================

@Injectable({
  providedIn: 'root'
})
export class PropietariosApiService {

  // ================================================
  // DEPENDENCIAS
  // ================================================

  private readonly http = inject(HttpClient);

  // ================================================
  // ENDPOINTS
  // ================================================

  private readonly endpoint =
    '/api/superadmin/propietarios';

  private readonly endpointCuentas =
    '/api/superadmin/propietarios/cuentas';

  // ================================================
  // LISTAR PROPIETARIOS REALES
  // ================================================

  listar(): Observable<PropietarioResumen[]> {

    return this.http.get<PropietarioResumen[]>(
      this.endpoint
    );
  }

  // ================================================
  // OBTENER PROPIETARIO POR TIENDA
  // ================================================

  obtenerPorTienda(
    tiendaId: number
  ): Observable<PropietarioResumen> {

    this.validarId(
      tiendaId,
      'tienda'
    );

    return this.http.get<PropietarioResumen>(
      `${this.endpoint}/tiendas/${tiendaId}`
    );
  }

  // ================================================
  // CANDIDATOS ADMIN DE UNA TIENDA
  // ================================================

  candidatos(
    tiendaId: number
  ): Observable<CandidatoPropietario[]> {

    this.validarId(
      tiendaId,
      'tienda'
    );

    const params = new HttpParams()
      .set(
        'tiendaId',
        String(tiendaId)
      );

    return this.http.get<CandidatoPropietario[]>(
      `${this.endpoint}/candidatos`,
      { params }
    );
  }

  // ================================================
  // CREAR CUENTA NUEVA DE PROPIETARIO
  // ================================================

  crear(
    datos: CrearPropietarioRequest
  ): Observable<PropietarioResumen> {

    this.validarId(
      datos.tiendaId,
      'tienda'
    );

    const solicitud: CrearPropietarioRequest = {

      tiendaId: datos.tiendaId,

      nombre: datos.nombre.trim(),

      apellido: datos.apellido.trim(),

      correo: datos.correo
        .trim()
        .toLowerCase(),

      // No modificamos ni almacenamos
      // la contraseña en el servicio.
      //
      // Spring Boot aplicará BCrypt.

      contrasena: datos.contrasena

    };

    return this.http.post<PropietarioResumen>(
      this.endpoint,
      solicitud
    );
  }

  // ================================================
  // ASIGNAR ADMIN EXISTENTE COMO PROPIETARIO
  // ================================================

  asignar(
    tiendaId: number,
    usuarioId: number
  ): Observable<PropietarioResumen> {

    this.validarId(
      tiendaId,
      'tienda'
    );

    this.validarId(
      usuarioId,
      'usuario'
    );

    const solicitud: AsignarPropietarioRequest = {
      usuarioId
    };

    return this.http.put<PropietarioResumen>(
      `${this.endpoint}/tiendas/${tiendaId}`,
      solicitud
    );
  }

  // ==================================================
  // NUEVAS FUNCIONES DEL MODULO DE CUENTAS
  // ==================================================

  // ================================================
  // 9. OBTENER CUENTA REAL DE PROPIETARIO
  // ================================================

  obtenerCuenta(
    tiendaId: number
  ): Observable<CuentaPropietarioResponse> {

    this.validarId(
      tiendaId,
      'tienda'
    );

    return this.http.get<CuentaPropietarioResponse>(
      `${this.endpointCuentas}/tiendas/${tiendaId}`
    );
  }

  // ================================================
  // 10. EDITAR DATOS DE PROPIETARIO
  // ================================================

  editarCuenta(
    tiendaId: number,
    datos: EditarCuentaPropietarioRequest
  ): Observable<CuentaPropietarioResponse> {

    this.validarId(
      tiendaId,
      'tienda'
    );

    const solicitud: EditarCuentaPropietarioRequest = {

      nombre: datos.nombre.trim(),

      apellido: datos.apellido.trim(),

      correo: datos.correo
        .trim()
        .toLowerCase()

    };

    return this.http.put<CuentaPropietarioResponse>(
      `${this.endpointCuentas}/tiendas/${tiendaId}`,
      solicitud
    );
  }

  // ================================================
  // 11. CAMBIAR ESTADO DE ACCESO
  // ================================================

  cambiarEstadoCuenta(
    tiendaId: number,
    activo: boolean
  ): Observable<CuentaPropietarioResponse> {

    this.validarId(
      tiendaId,
      'tienda'
    );

    const solicitud: CambiarEstadoCuentaRequest = {
      activo
    };

    return this.http.put<CuentaPropietarioResponse>(
      `${this.endpointCuentas}/tiendas/${tiendaId}/estado`,
      solicitud
    );
  }

  // ================================================
  // 12. ACTIVAR PROPIETARIO
  // ================================================

  activarCuenta(
    tiendaId: number
  ): Observable<CuentaPropietarioResponse> {

    return this.cambiarEstadoCuenta(
      tiendaId,
      true
    );
  }

  // ================================================
  // 13. DESACTIVAR PROPIETARIO
  // ================================================

  desactivarCuenta(
    tiendaId: number
  ): Observable<CuentaPropietarioResponse> {

    return this.cambiarEstadoCuenta(
      tiendaId,
      false
    );
  }

  // ================================================
  // 14. VALIDACIÓN DE IDENTIFICADORES
  // ================================================

  private validarId(
    id: number,
    tipo: string
  ): void {

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {

      throw new Error(
        `Identificador de ${tipo} inválido.`
      );
    }
  }

}

