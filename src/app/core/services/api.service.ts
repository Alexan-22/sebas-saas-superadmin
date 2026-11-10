import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TiendaResumen {
  id: number;
  nombre: string;
  subdominio: string;
}

export interface PaginaTiendas {
  tiendas: TiendaResumen[];
  total: number;
  pagina: number;
  tamano: number;
}

@Injectable({
  providedIn: 'root'
})
export class TiendasApiService {
  private readonly http = inject(HttpClient);

  // Angular enviara /api al backend mediante el proxy.
  private readonly url = '/api/superadmin/tiendas';

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
      this.url,
      { params }
    );
  }
}