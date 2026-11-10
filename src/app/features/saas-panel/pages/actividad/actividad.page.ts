
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface Actividad {
  id: number;
  usuario: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  descripcion: string;
  creado_en: string;
}

interface ResumenActividad {
  total: number;
  hoy: number;
  creaciones: number;
  actualizaciones: number;
}

@Component({
  selector: 'app-saas-actividad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actividad.page.html',
  styleUrls: ['./actividad.page.css']
})
export class ActividadPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/superadmin/actividad';

  actividades: Actividad[] = [];
  resumen: ResumenActividad = {
    total: 0, hoy: 0, creaciones: 0, actualizaciones: 0
  };

  busqueda = '';
  filtroAccion = 'TODAS';
  filtroEntidad = 'TODAS';
  pagina = 0;
  tamano = 10;
  cargando = false;
  error = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      actividades: this.http.get<Actividad[]>(`${this.api}?limite=500`),
      resumen: this.http.get<ResumenActividad>(`${this.api}/resumen`)
    }).subscribe({
      next: ({ actividades, resumen }) => {
        this.actividades = actividades;
        this.resumen = resumen;
        this.pagina = 0;
        this.cargando = false;
      },
      error: (e: HttpErrorResponse) => {
        this.error = e.status === 403
          ? 'No tienes permisos para consultar la actividad.'
          : `No se pudo cargar la actividad (HTTP ${e.status}).`;
        this.cargando = false;
      }
    });
  }

  get entidades(): string[] {
    return [...new Set(this.actividades.map(a => a.entidad))].sort();
  }

  get filtradas(): Actividad[] {
    const q = this.busqueda.trim().toLowerCase();

    return this.actividades.filter(a => {
      const texto = `${a.usuario} ${a.accion} ${a.entidad} ${a.descripcion}`.toLowerCase();

      return (!q || texto.includes(q)) &&
        (this.filtroAccion === 'TODAS' || a.accion === this.filtroAccion) &&
        (this.filtroEntidad === 'TODAS' || a.entidad === this.filtroEntidad);
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtradas.length / this.tamano));
  }

  get paginaActividades(): Actividad[] {
    const indice = Math.min(this.pagina, this.totalPaginas - 1);
    return this.filtradas.slice(indice * this.tamano, (indice + 1) * this.tamano);
  }

  get desde(): number {
    return this.filtradas.length ? this.pagina * this.tamano + 1 : 0;
  }

  get hasta(): number {
    return Math.min((this.pagina + 1) * this.tamano, this.filtradas.length);
  }

  limpiar(): void {
    this.busqueda = '';
    this.filtroAccion = 'TODAS';
    this.filtroEntidad = 'TODAS';
    this.pagina = 0;
  }

  exportar(): void {
    if (!this.filtradas.length) return;

    const datos = [
      ['ID', 'Fecha', 'Usuario', 'Acción', 'Entidad', 'ID entidad', 'Descripción'],
      ...this.filtradas.map(a => [
        String(a.id), a.creado_en, a.usuario, a.accion,
        a.entidad, a.entidad_id ?? '', a.descripcion
      ])
    ];

    const escapar = (valor: string) => {
      let texto = valor;
      if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const csv = '\uFEFF' + datos.map(f => f.map(escapar).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = 'actividad-sebas-saas.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
