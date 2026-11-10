import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { descargarCsv } from '../../saas.models';
import {
  PlanesApiService,
  PlanSaas,
  CrearPlanSaasRequest,
  EditarPlanSaasRequest
} from '../../../../core/services/planes-api.service';

type FiltroPlanes = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';
type OrdenPlanes = 'nombre' | 'precio-asc' | 'precio-desc';

interface FormPlan {
  codigo: string;
  nombre: string;
  descripcion: string;
  precioMensual: number;
  duracionMeses: number;
  limiteProductos: number | null;
  limiteUsuarios: number | null;
  limiteSucursales: number | null;
  beneficiosTexto: string;
}

function formularioVacio(): FormPlan {
  return {
    codigo: '',
    nombre: '',
    descripcion: '',
    precioMensual: 0,
    duracionMeses: 1,
    limiteProductos: 100,
    limiteUsuarios: 2,
    limiteSucursales: 1,
    beneficiosTexto: ''
  };
}

/**
 * Sebas Collection SaaS V2: catálogo REAL de planes.
 * No depende de SaasStore ni muestra cifras DEMO de suscripciones.
 * Los límites guardados se harán cumplir en un paso posterior del backend.
 */
@Component({
  selector: 'app-saas-planes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planes.page.html',
  styleUrls: ['../../saas-ui.css', './planes.page.css']
})
export class PlanesPage implements OnInit {
  private readonly api = inject(PlanesApiService);

  readonly planes = signal<PlanSaas[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  readonly estadisticas = computed(() => {
    const todos = this.planes();
    return {
      total: todos.length,
      activos: todos.filter(p => p.activo).length,
      inactivos: todos.filter(p => !p.activo).length,
      cotizacion: todos.filter(p => this.esEmpresarial(p)).length
    };
  });

  busqueda = '';
  filtro: FiltroPlanes = 'TODOS';
  orden: OrdenPlanes = 'nombre';
  pagina = 0;
  readonly tamano = 6;

  formVisible = false;
  editandoId: number | null = null;
  form: FormPlan = formularioVacio();
  detalleId: number | null = null;
  confirmacionId: number | null = null;

  ngOnInit(): void {
    this.cargarPlanes();
  }

  cargarPlanes(): void {
    if (this.cargando() || this.guardando()) return;
    this.cargando.set(true);
    this.error.set('');

    this.api.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: planes => {
          this.planes.set(Array.isArray(planes) ? planes : []);
          if (this.pagina >= this.totalPaginas) {
            this.pagina = this.totalPaginas - 1;
          }
        },
        error: (e: unknown) => {
          this.planes.set([]);
          this.error.set(this.mensajeError(e));
        }
      });
  }

  esProfesional(plan: PlanSaas): boolean {
    return plan.codigo === 'PROFESIONAL';
  }

  esEmpresarial(plan: PlanSaas): boolean {
    return plan.codigo === 'EMPRESARIAL';
  }

  limiteTexto(valor: number | null): string {
    return valor === null ? 'Según contrato' : String(valor);
  }

  nombreCupos(plan: PlanSaas): string {
    if (plan.codigo === 'BASICO' && plan.limiteUsuarios === 2) return '1 administrador + 1 empleado';
    if (plan.codigo === 'PROFESIONAL' && plan.limiteUsuarios === 5) return '1 administrador + hasta 4 empleados';
    return plan.limiteUsuarios === null
      ? 'Usuarios según contrato'
      : `Hasta ${plan.limiteUsuarios} cuentas internas`;
  }

  get filtrados(): PlanSaas[] {
    const buscar = this.busqueda.trim().toLocaleLowerCase('es');
    return this.planes()
      .filter(plan => {
        const texto = [plan.nombre, plan.codigo, plan.descripcion ?? '']
          .join(' ').toLocaleLowerCase('es');
        return (!buscar || texto.includes(buscar)) &&
          (this.filtro === 'TODOS' ||
            (this.filtro === 'ACTIVOS' && plan.activo) ||
            (this.filtro === 'INACTIVOS' && !plan.activo));
      })
      .sort((a, b) => {
        if (this.orden === 'precio-asc') return a.precioMensual - b.precioMensual;
        if (this.orden === 'precio-desc') return b.precioMensual - a.precioMensual;
        return a.nombre.localeCompare(b.nombre, 'es');
      });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.tamano));
  }

  get paginaPlanes(): PlanSaas[] {
    return this.filtrados.slice(this.pagina * this.tamano,
      (this.pagina + 1) * this.tamano);
  }

  get desde(): number {
    return this.filtrados.length ? this.pagina * this.tamano + 1 : 0;
  }

  get hasta(): number {
    return Math.min((this.pagina + 1) * this.tamano, this.filtrados.length);
  }

  reiniciarPagina(): void { this.pagina = 0; }
  anterior(): void { if (this.pagina > 0) this.pagina--; }
  siguiente(): void { if (this.pagina + 1 < this.totalPaginas) this.pagina++; }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtro = 'TODOS';
    this.orden = 'nombre';
    this.pagina = 0;
  }

  nuevo(): void {
    if (this.guardando()) return;
    this.form = formularioVacio();
    this.editandoId = null;
    this.formVisible = true;
    this.detalleId = null;
    this.confirmacionId = null;
    this.limpiarMensajes();
  }

  editar(plan: PlanSaas): void {
    if (this.guardando()) return;
    this.form = {
      codigo: plan.codigo,
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? '',
      precioMensual: plan.precioMensual,
      duracionMeses: plan.duracionMeses,
      limiteProductos: plan.limiteProductos,
      limiteUsuarios: plan.limiteUsuarios,
      limiteSucursales: plan.limiteSucursales,
      beneficiosTexto: plan.beneficios.join('\n')
    };
    this.editandoId = plan.id;
    this.formVisible = true;
    this.detalleId = null;
    this.confirmacionId = null;
    this.limpiarMensajes();
  }

  cerrarFormulario(): void {
    if (this.guardando()) return;
    this.formVisible = false;
    this.editandoId = null;
  }

  beneficiosFormulario(): string[] {
    return this.form.beneficiosTexto
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  private validarFormulario(): string | null {
    const f = this.form;
    if (this.editandoId === null && !/^[A-Z0-9_]{3,50}$/.test(f.codigo.trim().toUpperCase())) {
      return 'El código requiere entre 3 y 50 caracteres (A-Z, números y guion bajo).';
    }
    if (f.nombre.trim().length < 2 || f.nombre.trim().length > 100) {
      return 'El nombre debe tener entre 2 y 100 caracteres.';
    }
    if (f.descripcion.trim().length > 1000) return 'Descripción: máximo 1000 caracteres.';
    if (!Number.isFinite(f.precioMensual) || f.precioMensual < 0 ||
        f.precioMensual > 9999999999.99 || Math.abs(Math.round(f.precioMensual * 100) - f.precioMensual * 100) > 1e-7) {
      return 'El precio debe ser positivo y tener como máximo dos decimales.';
    }
    if (!Number.isInteger(f.duracionMeses) || f.duracionMeses < 1 || f.duracionMeses > 36) {
      return 'La duración debe ser un número entre 1 y 36 meses.';
    }
    for (const [nombre, valor] of [
      ['productos', f.limiteProductos],
      ['usuarios', f.limiteUsuarios],
      ['sucursales', f.limiteSucursales]
    ] as const) {
      if (valor !== null && (!Number.isInteger(valor) || valor < 1 || valor > 1_000_000)) {
        return `El límite de ${nombre} debe ser entero positivo o quedar vacío para personalizar.`;
      }
    }
    const beneficios = this.beneficiosFormulario();
    if (beneficios.length > 30 || beneficios.some(b => b.length > 200)) {
      return 'Máximo 30 beneficios, cada uno con hasta 200 caracteres.';
    }
    return null;
  }

  guardar(): void {
    if (this.guardando()) return;
    this.limpiarMensajes();
    const mensajeError = this.validarFormulario();
    if (mensajeError) {
      this.error.set(mensajeError);
      return;
    }
    const datos: EditarPlanSaasRequest = {
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion.trim() || null,
      precioMensual: this.form.precioMensual,
      duracionMeses: this.form.duracionMeses,
      limiteProductos: this.form.limiteProductos,
      limiteUsuarios: this.form.limiteUsuarios,
      limiteSucursales: this.form.limiteSucursales,
      beneficios: this.beneficiosFormulario()
    };
    const esEdicion = this.editandoId !== null;
    const peticion: Observable<PlanSaas> = esEdicion
      ? this.api.editar(this.editandoId as number, datos)
      : this.api.crear({ ...datos, codigo: this.form.codigo.trim().toUpperCase() } as CrearPlanSaasRequest);

    this.guardando.set(true);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: plan => {
        this.planes.update(actuales => esEdicion
          ? actuales.map(p => p.id === plan.id ? plan : p)
          : [...actuales, plan]);
        this.formVisible = false;
        this.editandoId = null;
        this.pagina = 0;
        this.mensaje.set(esEdicion ? 'Plan actualizado en Supabase.' : 'Plan creado en Supabase.');
      },
      error: (e: unknown) => this.error.set(this.mensajeError(e))
    });
  }

  get planDetalle(): PlanSaas | undefined {
    return this.planes().find(p => p.id === this.detalleId);
  }

  verDetalle(id: number): void {
    this.detalleId = id;
    this.formVisible = false;
    this.confirmacionId = null;
    this.limpiarMensajes();
  }

  cerrarDetalle(): void { this.detalleId = null; }

  get planPendiente(): PlanSaas | undefined {
    return this.planes().find(p => p.id === this.confirmacionId);
  }

  prepararDesactivacion(id: number): void {
    if (this.guardando()) return;
    this.confirmacionId = id;
    this.limpiarMensajes();
  }

  cancelarDesactivacion(): void {
    if (!this.guardando()) this.confirmacionId = null;
  }

  confirmarDesactivacion(): void {
    if (this.confirmacionId === null) return;
    this.cambiarDisponibilidad(this.confirmacionId, false);
  }

  activarPlan(id: number): void { this.cambiarDisponibilidad(id, true); }

  private cambiarDisponibilidad(id: number, activo: boolean): void {
    if (this.guardando()) return;
    this.limpiarMensajes();
    this.guardando.set(true);
    const peticion = activo ? this.api.activar(id) : this.api.desactivar(id);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: plan => {
        this.planes.update(actuales => actuales.map(p => p.id === id ? plan : p));
        this.confirmacionId = null;
        this.mensaje.set(activo ? 'Plan activado en Supabase.' : 'Plan desactivado en Supabase.');
      },
      error: (e: unknown) => this.error.set(this.mensajeError(e))
    });
  }

  exportar(): void {
    descargarCsv(
      'planes-sebas-saas-reales.csv',
      ['Código', 'Nombre', 'Descripción', 'Precio (PEN)', 'Meses', 'Usuarios', 'Productos',
        'Sucursales', 'Beneficios', 'Disponible'],
      this.filtrados.map(p => [
        p.codigo, p.nombre, p.descripcion ?? '', p.precioMensual, p.duracionMeses,
        this.limiteTexto(p.limiteUsuarios), this.limiteTexto(p.limiteProductos),
        this.limiteTexto(p.limiteSucursales), p.beneficios.join(' | '), p.activo ? 'Sí' : 'No'
      ])
    );
  }

  limpiarMensajes(): void {
    this.mensaje.set('');
    this.error.set('');
  }

  private mensajeError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      switch (e.status) {
        case 0: return 'No hay conexión con Spring Boot; revisa el proxy y el backend.';
        case 400: return 'Solicitud inválida (400). Revisa campos y límites.';
        case 401: return 'Sesión expirada o token ausente (401). Inicia sesión.';
        case 403: return 'Permiso denegado (403). Solo puede operar SUPER_ADMIN.';
        case 404: return 'El plan o endpoint no existe (404).';
        case 409: return 'Conflicto (409): el código del plan ya existe o incumple restricciones.';
        case 500: return 'Error del backend (500). Comprueba los logs de Spring Boot.';
        default: return `Error HTTP ${e.status} al gestionar planes.`;
      }
    }
    return e instanceof Error ? e.message : 'No se pudo completar la operación.';
  }
}
