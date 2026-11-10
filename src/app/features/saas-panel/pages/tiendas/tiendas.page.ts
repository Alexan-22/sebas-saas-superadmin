
import { CommonModule } from '@angular/common';

import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';

import { FormsModule } from '@angular/forms';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  TiendasApiService,
  TiendaResumen,
  EstadoTienda
} from '../../../../core/services/tiendas-api.service';

import {
  descargarCsv
} from '../../saas.models';

// ============================================
// SEBAS COLLECTION SAAS V2
// GESTION REAL DE TIENDAS
// ============================================

interface FormTienda {
  nombre: string;
  subdominio: string;
  colorPrimario: string;
  logoUrl: string;
}

type OrdenTiendas =
  | 'recientes'
  | 'antiguas'
  | 'nombre-asc'
  | 'nombre-desc';

interface ConfirmacionEstado {
  tiendaId: number;
  nombreTienda: string;
  estadoActual: EstadoTienda;
  nuevoEstado: EstadoTienda;
}

@Component({
  selector: 'app-saas-tiendas',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './tiendas.page.html',

  styleUrls: [
    '../../saas-ui.css',
    './tiendas.page.css'
  ]
})
export class TiendasPage implements OnInit {

  // ========================================
  // SERVICIOS
  // ========================================

  private readonly api =
    inject(TiendasApiService);

  private readonly destroyRef =
    inject(DestroyRef);

  // ========================================
  // DATOS REALES
  // ========================================

  readonly tiendas = signal<TiendaResumen[]>([]);

  readonly cargando = signal(false);

  readonly guardando = signal(false);

  readonly cambiandoEstado = signal(false);

  private totalServidor = 0;

  private solicitudActual = 0;

  // ========================================
  // BUSQUEDA Y ORDENAMIENTO
  // ========================================

  busqueda = '';

  orden: OrdenTiendas = 'recientes';

  // ========================================
  // PAGINACION
  // ========================================

  pagina = 0;

  readonly tamano = 8;

  // ========================================
  // FORMULARIO CREAR / EDITAR
  // ========================================

  formVisible = false;

  editandoId: number | null = null;

  form: FormTienda = this.formularioInicial();

  // ========================================
  // DETALLE
  // ========================================

  detalleId: number | null = null;

  // ========================================
  // CONFIRMACION DE ESTADO
  // ========================================

  confirmacionEstado: ConfirmacionEstado | null = null;

  // ========================================
  // MENSAJES
  // ========================================

  mensaje = '';

  error = '';

  // ========================================
  // INICIALIZAR
  // ========================================

  ngOnInit(): void {
    this.cargarTiendas();
  }

  // ========================================
  // FORMULARIO INICIAL
  // ========================================

  private formularioInicial(): FormTienda {

    return {
      nombre: '',
      subdominio: '',
      colorPrimario: '#000000',
      logoUrl: ''
    };
  }

  // ========================================
  // CONSULTAR TIENDAS REALES
  // ========================================

  cargarTiendas(): void {

    if (
      this.guardando() ||
      this.cambiandoEstado()
    ) {
      return;
    }

    const solicitud = ++this.solicitudActual;

    this.cargando.set(true);
    this.error = '';

    this.api.listar(
      this.busqueda.trim(),
      this.pagina,
      this.tamano
    )
    .pipe(
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe({

      next: respuesta => {

        if (solicitud !== this.solicitudActual) {
          return;
        }

        this.tiendas.set(respuesta.tiendas);

        this.totalServidor = respuesta.total;

        this.cargando.set(false);

      },

      error: fallo => {

        if (solicitud !== this.solicitudActual) {
          return;
        }

        this.tiendas.set([]);

        this.totalServidor = 0;

        this.cargando.set(false);

        this.error = this.mensajeError(fallo);

      }

    });
  }

  // ========================================
  // ESTADISTICAS DE LA PAGINA CARGADA
  // ========================================

  get totalTiendas(): number {
    return this.totalServidor;
  }

  get activasEnPagina(): number {

    return this.tiendas().filter(
      tienda => tienda.estado === 'ACTIVA'
    ).length;
  }

  get pendientesEnPagina(): number {

    return this.tiendas().filter(
      tienda => tienda.estado === 'PENDIENTE'
    ).length;
  }

  get suspendidasEnPagina(): number {

    return this.tiendas().filter(
      tienda => tienda.estado === 'SUSPENDIDA'
    ).length;
  }

  // ========================================
  // ORDENAR LA PAGINA ACTUAL
  // ========================================

  get filtradas(): TiendaResumen[] {

    const resultado = [...this.tiendas()];

    return resultado.sort((a, b) => {

      switch (this.orden) {

        case 'nombre-asc':
          return a.nombre.localeCompare(
            b.nombre,
            'es'
          );

        case 'nombre-desc':
          return b.nombre.localeCompare(
            a.nombre,
            'es'
          );

        case 'antiguas':
          return (a.creadaEn ?? '')
            .localeCompare(b.creadaEn ?? '');

        case 'recientes':
        default:
          return (b.creadaEn ?? '')
            .localeCompare(a.creadaEn ?? '');
      }
    });
  }

  // ========================================
  // PAGINACION REAL
  // ========================================

  get paginaTiendas(): TiendaResumen[] {
    return this.filtradas;
  }

  get totalPaginas(): number {

    return Math.max(
      1,
      Math.ceil(this.totalServidor / this.tamano)
    );
  }

  get desde(): number {

    if (this.tiendas().length === 0) {
      return 0;
    }

    return this.pagina * this.tamano + 1;
  }

  get hasta(): number {

    return Math.min(
      this.totalServidor,
      this.pagina * this.tamano +
        this.tiendas().length
    );
  }

  reiniciarPagina(): void {

    if (this.cambiandoEstado()) {
      return;
    }

    this.pagina = 0;
    this.cargarTiendas();
  }

  anterior(): void {

    if (
      this.pagina > 0 &&
      !this.cargando() &&
      !this.cambiandoEstado()
    ) {

      this.pagina--;
      this.cargarTiendas();
    }
  }

  siguiente(): void {

    if (
      !this.cargando() &&
      !this.cambiandoEstado() &&
      this.pagina + 1 < this.totalPaginas
    ) {

      this.pagina++;
      this.cargarTiendas();
    }
  }

  limpiarFiltros(): void {

    if (this.cambiandoEstado()) {
      return;
    }

    this.busqueda = '';
    this.orden = 'recientes';
    this.pagina = 0;

    this.cargarTiendas();
  }

  // ========================================
  // CREAR TIENDA
  // ========================================

  nueva(): void {

    if (
      this.guardando() ||
      this.cambiandoEstado()
    ) {
      return;
    }

    this.editandoId = null;

    this.form = this.formularioInicial();

    this.formVisible = true;

    this.detalleId = null;

    this.confirmacionEstado = null;

    this.limpiarMensajes();
  }

  // ========================================
  // EDITAR TIENDA
  // ========================================

  editar(tienda: TiendaResumen): void {

    if (
      this.guardando() ||
      this.cambiandoEstado()
    ) {
      return;
    }

    this.editandoId = tienda.id;

    this.form = {
      nombre: tienda.nombre,
      subdominio: tienda.subdominio,
      colorPrimario:
        tienda.colorPrimario ?? '#000000',
      logoUrl: tienda.logoUrl ?? ''
    };

    this.formVisible = true;

    this.detalleId = null;

    this.confirmacionEstado = null;

    this.limpiarMensajes();
  }

  get esEdicion(): boolean {
    return this.editandoId !== null;
  }

  get vistaSubdominio(): string {

    return this.form.subdominio
      .trim()
      .toLowerCase();
  }

  // ========================================
  // GUARDAR TIENDA - POST / PUT
  // ========================================

  guardar(): void {

    if (
      !this.formVisible ||
      this.guardando() ||
      this.cambiandoEstado()
    ) {
      return;
    }

    this.limpiarMensajes();

    const nombre =
      this.form.nombre.trim();

    const subdominio =
      this.form.subdominio
        .trim()
        .toLowerCase();

    const colorPrimario =
      this.form.colorPrimario
        .trim()
        .toUpperCase();

    const logoUrl =
      this.form.logoUrl.trim();

    // VALIDAR NOMBRE

    if (
      nombre.length < 3 ||
      nombre.length > 100
    ) {

      this.error =
        'El nombre debe tener entre ' +
        '3 y 100 caracteres.';

      return;
    }

    // VALIDAR SUBDOMINIO

    const patronSubdominio =
      /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

    if (!patronSubdominio.test(subdominio)) {

      this.error =
        'El subdominio debe tener entre ' +
        '3 y 40 caracteres válidos.';

      return;
    }

    // VALIDAR CAMPOS DE EDICION

    if (this.esEdicion) {

      if (!/^#[0-9A-F]{6}$/.test(colorPrimario)) {

        this.error =
          'El color debe tener formato #RRGGBB.';

        return;
      }

      if (logoUrl.length > 500) {

        this.error =
          'La URL del logo no debe superar ' +
          '500 caracteres.';

        return;
      }

      if (logoUrl) {

        try {

          const url = new URL(logoUrl);

          if (
            url.protocol !== 'https:' ||
            !url.hostname ||
            url.username ||
            url.password
          ) {
            throw new Error('URL inválida');
          }

        } catch {

          this.error =
            'El logo debe utilizar una URL HTTPS válida.';

          return;
        }
      }
    }

    this.guardando.set(true);

    const idEdicion = this.editandoId;

    // POST - CREAR
    // PUT - EDITAR

    const operacion = idEdicion === null

      ? this.api.crear({
          nombre,
          subdominio
        })

      : this.api.actualizar(
          idEdicion,
          {
            nombre,
            subdominio,
            colorPrimario,
            logoUrl: logoUrl || null
          }
        );

    operacion
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: tienda => {

          this.guardando.set(false);

          this.formVisible = false;

          this.editandoId = null;

          this.form = this.formularioInicial();

          this.mensaje = idEdicion === null
            ? `La tienda "${tienda.nombre}" se registró correctamente.`
            : `La tienda "${tienda.nombre}" se actualizó correctamente.`;

          this.error = '';

          this.detalleId = null;

          this.busqueda = '';
          this.pagina = 0;

          this.cargarTiendas();
        },

        error: fallo => {

          this.guardando.set(false);

          this.error = this.mensajeError(fallo);
        }

      });
  }

  // ========================================
  // CERRAR FORMULARIO
  // ========================================

  cerrarFormulario(): void {

    if (this.guardando()) {
      return;
    }

    this.formVisible = false;
    this.editandoId = null;
  }

  // ========================================
  // DETALLES
  // ========================================

  get tiendaDetalle():
    TiendaResumen | undefined {

    return this.tiendas().find(
      tienda => tienda.id === this.detalleId
    );
  }

  verDetalle(id: number): void {

    if (this.cambiandoEstado()) {
      return;
    }

    this.detalleId = id;

    this.formVisible = false;

    this.confirmacionEstado = null;

    this.limpiarMensajes();
  }

  cerrarDetalle(): void {
    this.detalleId = null;
  }

  // ========================================
  // SOLICITAR CAMBIO DE ESTADO
  // ========================================

  solicitarCambioEstado(
    tienda: TiendaResumen,
    nuevoEstado: EstadoTienda
  ): void {

    if (
      this.guardando() ||
      this.cambiandoEstado()
    ) {
      return;
    }

    if (tienda.estado === nuevoEstado) {
      return;
    }

    // NO SE ENVIA TODAVIA NINGUNA PETICION.
    // Primero se necesita una confirmacion.

    this.confirmacionEstado = {
      tiendaId: tienda.id,
      nombreTienda: tienda.nombre,
      estadoActual: tienda.estado,
      nuevoEstado
    };

    this.formVisible = false;
    this.detalleId = null;

    this.limpiarMensajes();
  }

  // ========================================
  // CANCELAR CAMBIO DE ESTADO
  // ========================================

  cancelarCambioEstado(): void {

    if (this.cambiandoEstado()) {
      return;
    }

    this.confirmacionEstado = null;
  }

  // ========================================
  // CONFIRMAR CAMBIO DE ESTADO
  // ========================================

  confirmarCambioEstado(): void {

    const confirmacion = this.confirmacionEstado;

    if (
      confirmacion === null ||
      this.guardando() ||
      this.cambiandoEstado()
    ) {
      return;
    }

    this.limpiarMensajes();

    this.cambiandoEstado.set(true);

    const {
      tiendaId,
      nombreTienda,
      nuevoEstado
    } = confirmacion;

    // ELEGIR EL ENDPOINT REAL

    const operacion = nuevoEstado === 'ACTIVA'

      ? this.api.activar(tiendaId)

      : nuevoEstado === 'SUSPENDIDA'

        ? this.api.suspender(tiendaId)

        : this.api.marcarPendiente(tiendaId);

    operacion
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({

        next: tiendaActualizada => {

          // ACTUALIZAR LA FILA EN MEMORIA
          // DESPUES DE LA RESPUESTA EXITOSA.

          this.tiendas.update(lista =>
            lista.map(tienda =>
              tienda.id === tiendaActualizada.id
                ? tiendaActualizada
                : tienda
            )
          );

          this.confirmacionEstado = null;

          this.cambiandoEstado.set(false);

          this.mensaje =
            `La tienda "${nombreTienda}" cambió ` +
            `al estado ${tiendaActualizada.estado}.`;

          this.error = '';

          // SINCRONIZAR DE NUEVO CON SUPABASE

          this.cargarTiendas();
        },

        error: fallo => {

          this.cambiandoEstado.set(false);

          this.error = this.mensajeError(fallo);

          // Se conserva la confirmacion para
          // permitir cancelar o volver a intentar.
        }

      });
  }

  // ========================================
  // ETIQUETA DE ESTADO
  // ========================================

  nombreEstado(
    estado: EstadoTienda
  ): string {

    switch (estado) {

      case 'ACTIVA':
        return 'Activa';

      case 'PENDIENTE':
        return 'Pendiente';

      case 'SUSPENDIDA':
        return 'Suspendida';
    }
  }

  // ========================================
  // EXPORTAR DATOS REALES
  // ========================================

  exportar(): void {

    if (
      this.cargando() ||
      this.cambiandoEstado() ||
      this.tiendas().length === 0
    ) {
      return;
    }

    descargarCsv(
      'tiendas-supabase-pagina.csv',

      [
        'ID',
        'Nombre',
        'Subdominio',
        'Estado',
        'Color principal',
        'Logo URL',
        'Fecha de registro'
      ],

      this.filtradas.map(tienda => [
        String(tienda.id),
        tienda.nombre,
        tienda.subdominio,
        tienda.estado,
        tienda.colorPrimario ?? '',
        tienda.logoUrl ?? '',
        tienda.creadaEn ?? ''
      ])
    );
  }

  // ========================================
  // MANEJO DE ERRORES HTTP
  // ========================================

  private mensajeError(
    fallo: unknown
  ): string {

    if (!(fallo instanceof HttpErrorResponse)) {
      return 'Ocurrió un error inesperado.';
    }

    switch (fallo.status) {

      case 0:
        return (
          'No se pudo conectar con Spring Boot. ' +
          'Comprueba que esté funcionando.'
        );

      case 400:
        return (
          'Los datos enviados no son válidos. ' +
          'Revisa la información.'
        );

      case 401:
        return (
          'La sesión no está autorizada. ' +
          'Inicia sesión nuevamente.'
        );

      case 403:
        return (
          'No tienes permisos para realizar ' +
          'esta operación.'
        );

      case 404:
        return (
          'La tienda no existe o el endpoint ' +
          'no está disponible.'
        );

      case 409:
        return (
          'La operación entra en conflicto ' +
          'con los datos registrados.'
        );

      case 500:
        return (
          'Spring Boot no pudo completar la operación. ' +
          'Revisa sus registros.'
        );

      default:
        return (
          'Error HTTP ' + fallo.status +
          ' al procesar la solicitud.'
        );
    }
  }

  // ========================================
  // LIMPIAR MENSAJES
  // ========================================

  limpiarMensajes(): void {

    this.mensaje = '';
    this.error = '';
  }
}



