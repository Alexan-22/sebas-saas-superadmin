
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface ResumenSaas {
  total_tiendas: number;
  planes_activos: number;
  total_suscripciones: number;
  suscripciones_activas: number;
  suscripciones_pendientes: number;
  suscripciones_canceladas: number;
  suscripciones_vencidas: number;
  proximas_a_vencer: number;
  mrr_contratado: number;
}

interface ReportePlan {
  plan_id: number;
  plan: string;
  suscripciones_activas: number;
  mrr_contratado: number;
}

interface ReporteSuscripcion {
  id: number;
  tienda: string;
  plan: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio_contratado: number;
  moneda: string;
}

@Component({
  selector: 'app-saas-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.css']
})
export class ReportesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/superadmin/reportes/saas';

  resumen: ResumenSaas | null = null;
  planes: ReportePlan[] = [];
  suscripciones: ReporteSuscripcion[] = [];

  busqueda = '';
  filtroEstado = 'TODOS';
  filtroPlan = 'TODOS';
  orden = 'vencimiento-asc';

  cargando = false;
  error = '';
  actualizado = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.cargando) return;

    this.cargando = true;
    this.error = '';

    forkJoin({
      resumen: this.http.get<ResumenSaas>(`${this.api}/resumen`),
      planes: this.http.get<ReportePlan[]>(`${this.api}/planes`),
      suscripciones: this.http.get<ReporteSuscripcion[]>(`${this.api}/suscripciones`)
    }).subscribe({
      next: ({ resumen, planes, suscripciones }) => {
        this.resumen = resumen;
        this.planes = planes.map(p => ({
          ...p,
          suscripciones_activas: Number(p.suscripciones_activas ?? 0),
          mrr_contratado: Number(p.mrr_contratado ?? 0)
        }));

        this.suscripciones = suscripciones.map(s => ({
          ...s,
          fecha_inicio: this.fecha(s.fecha_inicio),
          fecha_fin: this.fecha(s.fecha_fin),
          precio_contratado: Number(s.precio_contratado ?? 0)
        }));

        this.actualizado = new Date().toLocaleString('es-PE');
        this.cargando = false;
      },
      error: (e: HttpErrorResponse) => {
        this.error = this.mensajeError(e);
        this.cargando = false;
      }
    });
  }

  private fecha(valor: string): string {
    return typeof valor === 'string' ? valor.slice(0, 10) : '';
  }

  private hoy(): string {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const valor = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }

  estado(s: ReporteSuscripcion): string {
    if (s.estado === 'CANCELADA') return 'CANCELADA';

    const hoy = this.hoy();

    if (s.fecha_fin <= hoy) return 'VENCIDA';
    if (s.fecha_inicio > hoy) return 'PENDIENTE';

    return 'ACTIVA';
  }

  diasRestantes(fecha: string): number {
    const fin = Date.parse(`${fecha}T00:00:00Z`);
    const hoy = Date.parse(`${this.hoy()}T00:00:00Z`);

    if (!Number.isFinite(fin)) return 0;
    return Math.round((fin - hoy) / 86400000);
  }

  get filtradas(): ReporteSuscripcion[] {
    const q = this.busqueda.trim().toLowerCase();

    return this.suscripciones
      .filter(s => {
        const coincideTexto = !q || `${s.tienda} ${s.plan}`.toLowerCase().includes(q);
        const coincideEstado = this.filtroEstado === 'TODOS' || this.estado(s) === this.filtroEstado;
        const coincidePlan = this.filtroPlan === 'TODOS' || s.plan === this.filtroPlan;

        return coincideTexto && coincideEstado && coincidePlan;
      })
      .sort((a, b) => {
        if (this.orden === 'vencimiento-desc') return b.fecha_fin.localeCompare(a.fecha_fin);
        if (this.orden === 'inicio-desc') return b.fecha_inicio.localeCompare(a.fecha_inicio);
        if (this.orden === 'inicio-asc') return a.fecha_inicio.localeCompare(b.fecha_inicio);
        return a.fecha_fin.localeCompare(b.fecha_fin);
      });
  }

  get mrr(): number {
    return Number(this.resumen?.mrr_contratado ?? 0);
  }

  get mrrFiltrado(): number {
    return this.filtradas
      .filter(s => this.estado(s) === 'ACTIVA')
      .reduce((total, s) => total + s.precio_contratado, 0);
  }

  get ingresoAnualEstimado(): number {
    return this.mrr * 12;
  }

  get porcentajeTiendasSuscritas(): number {
    const total = Number(this.resumen?.total_tiendas ?? 0);
    const activas = Number(this.resumen?.suscripciones_activas ?? 0);

    return total > 0 ? Math.min(100, Math.round(activas / total * 100)) : 0;
  }

  get maximoPlan(): number {
    return Math.max(1, ...this.planes.map(p => p.mrr_contratado));
  }

  anchoPlan(plan: ReportePlan): number {
    return this.maximoPlan > 0 ? plan.mrr_contratado / this.maximoPlan * 100 : 0;
  }

  get vencimientos(): ReporteSuscripcion[] {
    return this.suscripciones
      .filter(s => this.estado(s) === 'ACTIVA' &&
        this.diasRestantes(s.fecha_fin) >= 0 &&
        this.diasRestantes(s.fecha_fin) <= 15)
      .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin));
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = 'TODOS';
    this.filtroPlan = 'TODOS';
    this.orden = 'vencimiento-asc';
  }

  exportarCsv(): void {
    if (!this.filtradas.length) return;

    const filas: (string | number)[][] = [
      ['ID', 'Tienda', 'Plan', 'Estado efectivo', 'Inicio', 'Fin', 'Precio contratado', 'Moneda'],
      ...this.filtradas.map(s => [
        s.id, s.tienda, s.plan, this.estado(s),
        s.fecha_inicio, s.fecha_fin, s.precio_contratado, s.moneda
      ])
    ];

    const escapar = (valor: string | number): string => {
      let texto = String(valor ?? '');
      if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const csv = '\uFEFF' + filas.map(f => f.map(escapar).join(';')).join('\r\n');
    const archivo = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = `reporte-suscripciones-${this.hoy()}.csv`;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  private mensajeError(e: HttpErrorResponse): string {
    if (e.status === 0) return 'No se pudo conectar con Spring Boot.';
    if (e.status === 401) return 'La sesión ha vencido. Vuelve a iniciar sesión.';
    if (e.status === 403) return 'No tienes permisos para consultar los reportes.';
    if (e.status === 404) return 'No se encontraron los endpoints de Reportes. Reinicia Spring Boot.';
    return `No fue posible consultar los reportes (HTTP ${e.status}).`;
  }
}


