import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type EstadoSuscripcion =
  | 'PENDIENTE'
  | 'ACTIVA'
  | 'VENCIDA'
  | 'CANCELADA';

export interface Suscripcion {
  id: number;
  tienda_id: number;
  tienda: string;
  plan_id: number;
  plan: string;
  estado: EstadoSuscripcion;
  fecha_inicio: string;
  fecha_fin: string;
  precio_contratado: number;
  moneda: string;
}

export interface CrearSuscripcionRequest {
  tiendaId: number;
  planId: number;
  fechaInicio: string;
  precioContratado?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class SuscripcionesService {

  private readonly http = inject(HttpClient);

  private readonly api =
    `${API_BASE_URL}/api/superadmin/suscripciones`;

  listar(): Observable<Suscripcion[]> {
    return this.http.get<Suscripcion[]>(this.api);
  }

  listarPorTienda(
    tiendaId: number
  ): Observable<Suscripcion[]> {
    return this.http.get<Suscripcion[]>(
      `${this.api}/tienda/${tiendaId}`
    );
  }

  crear(
    solicitud: CrearSuscripcionRequest
  ): Observable<Suscripcion> {
    return this.http.post<Suscripcion>(
      this.api,
      solicitud
    );
  }
}
