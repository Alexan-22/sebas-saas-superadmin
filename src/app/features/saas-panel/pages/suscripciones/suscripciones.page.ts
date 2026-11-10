
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

type Estado = 'PENDIENTE' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA';

interface Suscripcion {
  id: number;
  tienda_id: number;
  tienda: string;
  plan_id: number;
  plan: string;
  estado: Estado;
  fecha_inicio: string;
  fecha_fin: string;
  precio_contratado: number;
  moneda: string;
}

interface Tienda {
  id: number;
  nombre: string;
}

interface Plan {
  id: number;
  nombre: string;
  precio_mensual: number;
  activo: boolean;
}

interface FormularioSuscripcion {
  tiendaId: number | null;
  planId: number | null;
  fechaInicio: string;
  precioContratado: number | null;
}

@Component({
  selector: 'app-saas-suscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suscripciones.page.html',
  styleUrls: ['../../saas-ui.css', './suscripciones.page.css']
})
export class SuscripcionesPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/superadmin';

  suscripciones: Suscripcion[] = [];
  tiendas: Tienda[] = [];
  planes: Plan[] = [];

  busqueda = '';
  filtroEstado = 'TODOS';
  filtroPlan = 'TODOS';
  orden = 'vencimiento-asc';

  cargando = false;
  guardando = false;
  formVisible = false;
  mensaje = '';
  error = '';

  formulario: FormularioSuscripcion = this.formularioVacio();

  ngOnInit(): void {
    this.cargar();
  }

  private normalizarFecha(fecha: string): string {
    return typeof fecha === 'string' ? fecha.slice(0, 10) : '';
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

  private formularioVacio(): FormularioSuscripcion {
    return {
      tiendaId: null,
      planId: null,
      fechaInicio: this.hoy(),
      precioContratado: null
    };
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      suscripciones: this.http.get<Suscripcion[]>(`${this.api}/suscripciones`),
      tiendas: this.http.get<unknown>(`${this.api}/tiendas`),
      planes: this.http.get<Plan[]>(`${this.api}/planes`)
    }).subscribe({
      next: ({ suscripciones, tiendas, planes }) => {
        this.suscripciones = suscripciones.map(s => ({
          ...s,
          fecha_inicio: this.normalizarFecha(s.fecha_inicio),
          fecha_fin: this.normalizarFecha(s.fecha_fin),
          precio_contratado: Number(s.precio_contratado)
        }));

        this.tiendas = this.extraerTiendas(tiendas);
        this.planes = planes.filter(p => p.activo);
        this.cargando = false;
      },
      error: (e: HttpErrorResponse) => {
        this.error = this.mensajeError(e);
        this.cargando = false;
      }
    });
  }

  private extraerTiendas(respuesta: unknown): Tienda[] {
    if (Array.isArray(respuesta)) return respuesta;

    if (respuesta && typeof respuesta === 'object') {
      const datos = respuesta as Record<string, unknown>;
      if (Array.isArray(datos['tiendas'])) return datos['tiendas'];
      if (Array.isArray(datos['content'])) return datos['content'];
    }

    return [];
  }

  estado(s: Suscripcion): Estado {
    if (s.estado === 'CANCELADA') return 'CANCELADA';

    const hoy = this.hoy();
    const inicio = this.normalizarFecha(s.fecha_inicio);
    const fin = this.normalizarFecha(s.fecha_fin);

    if (!inicio || !fin) return s.estado;
    if (fin <= hoy) return 'VENCIDA';
    if (inicio > hoy) return 'PENDIENTE';

    return 'ACTIVA';
  }

  diasRestantes(fecha: string): number {
    const fin = Date.parse(`${this.normalizarFecha(fecha)}T00:00:00Z`);
    const hoy = Date.parse(`${this.hoy()}T00:00:00Z`);

    if (!Number.isFinite(fin) || !Number.isFinite(hoy)) return 0;
    return Math.round((fin - hoy) / 86400000);
  }

  get filtradas(): Suscripcion[] {
    const q = this.busqueda.trim().toLowerCase();

    return this.suscripciones
      .filter(s => {
        const texto = `${s.tienda} ${s.plan}`.toLowerCase();

        return (!q || texto.includes(q)) &&
          (this.filtroEstado === 'TODOS' || this.estado(s) === this.filtroEstado) &&
          (this.filtroPlan === 'TODOS' || String(s.plan_id) === this.filtroPlan);
      })
      .sort((a, b) => {
        if (this.orden === 'vencimiento-desc') return b.fecha_fin.localeCompare(a.fecha_fin);
        if (this.orden === 'inicio-desc') return b.fecha_inicio.localeCompare(a.fecha_inicio);
        if (this.orden === 'inicio-asc') return a.fecha_inicio.localeCompare(b.fecha_inicio);
        return a.fecha_fin.localeCompare(b.fecha_fin);
      });
  }

  get activas(): number {
    return this.suscripciones.filter(s => this.estado(s) === 'ACTIVA').length;
  }

  get pendientes(): number {
    return this.suscripciones.filter(s => this.estado(s) === 'PENDIENTE').length;
  }

  get vencidas(): number {
    return this.suscripciones.filter(s => this.estado(s) === 'VENCIDA').length;
  }

  get canceladas(): number {
    return this.suscripciones.filter(s => this.estado(s) === 'CANCELADA').length;
  }

  get porVencer(): Suscripcion[] {
    return this.suscripciones.filter(s =>
      this.estado(s) === 'ACTIVA' &&
      this.diasRestantes(s.fecha_fin) >= 0 &&
      this.diasRestantes(s.fecha_fin) <= 15
    );
  }

  get ingresoMensualEstimado(): number {
    return this.suscripciones
      .filter(s => this.estado(s) === 'ACTIVA')
      .reduce((total, s) => total + Number(s.precio_contratado || 0), 0);
  }

  nueva(): void {
    this.formulario = this.formularioVacio();
    this.formVisible = true;
    this.mensaje = '';
    this.error = '';
  }

  cerrarFormulario(): void {
    if (!this.guardando) this.formVisible = false;
  }

  cambiarPlan(): void {
    const plan = this.planes.find(p => p.id === this.formulario.planId);

    this.formulario.precioContratado = plan && plan.id !== 5
      ? Number(plan.precio_mensual)
      : null;
  }

  guardar(): void {
    if (this.guardando) return;

    const f = this.formulario;

    if (!f.tiendaId || !f.planId || !f.fechaInicio) {
      this.error = 'Selecciona una tienda, un plan y la fecha de inicio.';
      return;
    }

    if (!this.tiendas.some(t => t.id === f.tiendaId)) {
      this.error = 'Selecciona una tienda válida.';
      return;
    }

    if (!this.planes.some(p => p.id === f.planId)) {
      this.error = 'Selecciona un plan activo.';
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.fechaInicio) || f.fechaInicio < this.hoy()) {
      this.error = 'Selecciona una fecha de inicio válida, desde hoy.';
      return;
    }

    if (f.precioContratado === null ||
        !Number.isFinite(f.precioContratado) ||
        f.precioContratado < 0 ||
        Math.abs(f.precioContratado * 100 - Math.round(f.precioContratado * 100)) > 0.000001) {
      this.error = 'Ingresa un precio válido con máximo dos decimales.';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.http.post(`${this.api}/suscripciones`, {
      tiendaId: f.tiendaId,
      planId: f.planId,
      fechaInicio: f.fechaInicio,
      precioContratado: f.precioContratado
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.formVisible = false;
        this.mensaje = 'Suscripción registrada correctamente.';
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        this.guardando = false;
        this.error = this.mensajeError(e);
      }
    });
  }

  private mensajeError(e: HttpErrorResponse): string {
    if (e.status === 0) return 'No se pudo conectar con Spring Boot.';
    if (e.status === 400) return 'Datos incorrectos o la tienda ya tiene una suscripción vigente.';
    if (e.status === 401) return 'Tu sesión venció. Inicia sesión nuevamente.';
    if (e.status === 403) return 'No tienes permisos para esta operación.';
    if (e.status === 404) return 'No se encontró el endpoint solicitado.';
    if (e.status === 409) return 'La tienda ya tiene una suscripción incompatible.';
    return `Error del servidor (HTTP ${e.status}).`;
  }
}
