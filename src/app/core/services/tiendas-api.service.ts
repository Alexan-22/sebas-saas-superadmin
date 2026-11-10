
import { Injectable, inject } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

// ============================================
// SEBAS COLLECTION SAAS V2
// SERVICIO API DE TIENDAS
// Angular -> Spring Boot -> Supabase
// ============================================

// ============================================
// 1. ESTADOS PERMITIDOS
// ============================================

export type EstadoTienda =
  | 'ACTIVA'
  | 'PENDIENTE'
  | 'SUSPENDIDA';

// ============================================
// 2. TIENDA REAL
// ============================================

export interface TiendaResumen {

  id: number;

  nombre: string;

  subdominio: string;

  colorPrimario: string | null;

  logoUrl: string | null;

  creadaEn: string | null;

  estado: EstadoTienda;

}

// ============================================
// 3. LISTADO PAGINADO
// ============================================

export interface PaginaTiendas {

  tiendas: TiendaResumen[];

  total: number;

  pagina: number;

  tamano: number;

}

// ============================================
// 4. DATOS PARA CREAR TIENDA
// ============================================

export interface CrearTiendaRequest {

  nombre: string;

  subdominio: string;

}

// ============================================
// 5. DATOS PARA EDITAR TIENDA
// ============================================

export interface ActualizarTiendaRequest {

  nombre: string;

  subdominio: string;

  colorPrimario: string;

  logoUrl: string | null;

}

// ============================================
// 6. SERVICIO ANGULAR
// ============================================

@Injectable({
  providedIn: 'root'
})
export class TiendasApiService {

  private readonly http = inject(HttpClient);

  private readonly endpoint =
    '/api/superadmin/tiendas';

  // ==========================================
  // GET - LISTAR TIENDAS
  // ==========================================

  listar(
    buscar: string = '',
    pagina: number = 0,
    tamano: number = 20
  ): Observable<PaginaTiendas> {

    const params = new HttpParams()
      .set('buscar', buscar.trim())
      .set('pagina', String(pagina))
      .set('tamano', String(tamano));

    return this.http.get<PaginaTiendas>(
      this.endpoint,
      { params }
    );
  }

  // ==========================================
  // POST - CREAR TIENDA
  // ==========================================

  crear(
    datos: CrearTiendaRequest
  ): Observable<TiendaResumen> {

    const solicitud: CrearTiendaRequest = {

      nombre: datos.nombre.trim(),

      subdominio: datos.subdominio
        .trim()
        .toLowerCase()

    };

    return this.http.post<TiendaResumen>(
      this.endpoint,
      solicitud
    );
  }

  // ==========================================
  // PUT - ACTUALIZAR TIENDA
  // ==========================================

  actualizar(
    id: number,
    datos: ActualizarTiendaRequest
  ): Observable<TiendaResumen> {

    this.validarId(id);

    const solicitud: ActualizarTiendaRequest = {

      nombre: datos.nombre.trim(),

      subdominio: datos.subdominio
        .trim()
        .toLowerCase(),

      colorPrimario: datos.colorPrimario
        .trim()
        .toUpperCase(),

      logoUrl: datos.logoUrl?.trim() || null

    };

    return this.http.put<TiendaResumen>(
      `${this.endpoint}/${id}`,
      solicitud
    );
  }

  // ==========================================
  // PUT - ACTIVAR TIENDA
  // ==========================================

  activar(
    id: number
  ): Observable<TiendaResumen> {

    this.validarId(id);

    return this.http.put<TiendaResumen>(
      `${this.endpoint}/${id}/activar`,
      {}
    );
  }

  // ==========================================
  // PUT - SUSPENDER TIENDA
  // ==========================================

  suspender(
    id: number
  ): Observable<TiendaResumen> {

    this.validarId(id);

    return this.http.put<TiendaResumen>(
      `${this.endpoint}/${id}/suspender`,
      {}
    );
  }

  // ==========================================
  // PUT - MARCAR COMO PENDIENTE
  // ==========================================

  marcarPendiente(
    id: number
  ): Observable<TiendaResumen> {

    this.validarId(id);

    return this.http.put<TiendaResumen>(
      `${this.endpoint}/${id}/pendiente`,
      {}
    );
  }

  // ==========================================
  // VALIDAR ID ANTES DE ENVIAR LA SOLICITUD
  // ==========================================

  private validarId(
    id: number
  ): void {

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      throw new Error(
        'Identificador de tienda inválido.'
      );
    }
  }

}



