import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Respuesta real de SuperAdminPlanController.java. */
export interface PlanSaas {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioMensual: number;
  moneda: string;
  duracionMeses: number;
  limiteProductos: number | null;
  limiteUsuarios: number | null;
  limiteSucursales: number | null;
  beneficios: string[];
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearPlanSaasRequest {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioMensual: number;
  duracionMeses: number;
  limiteProductos: number | null;
  limiteUsuarios: number | null;
  limiteSucursales: number | null;
  beneficios: string[];
}

/** El código del plan es inmutable, por eso no se envía al editar. */
export type EditarPlanSaasRequest = Omit<CrearPlanSaasRequest, 'codigo'>;

@Injectable({ providedIn: 'root' })
export class PlanesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/superadmin/planes';

  listar(activo?: boolean): Observable<PlanSaas[]> {
    const params = activo === undefined
      ? undefined
      : new HttpParams().set('activo', String(activo));
    return this.http.get<PlanSaas[]>(this.base, { params });
  }

  obtener(id: number): Observable<PlanSaas> {
    this.validarId(id);
    return this.http.get<PlanSaas>(`${this.base}/${id}`);
  }

  crear(datos: CrearPlanSaasRequest): Observable<PlanSaas> {
    return this.http.post<PlanSaas>(this.base, datos);
  }

  editar(id: number, datos: EditarPlanSaasRequest): Observable<PlanSaas> {
    this.validarId(id);
    return this.http.put<PlanSaas>(`${this.base}/${id}`, datos);
  }

  activar(id: number): Observable<PlanSaas> {
    this.validarId(id);
    return this.http.put<PlanSaas>(`${this.base}/${id}/activar`, {});
  }

  desactivar(id: number): Observable<PlanSaas> {
    this.validarId(id);
    return this.http.put<PlanSaas>(`${this.base}/${id}/desactivar`, {});
  }

  private validarId(id: number): void {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('Identificador de plan inválido.');
    }
  }
}
