
import {
  Injectable,
  computed,
  inject
} from '@angular/core';

import { SaasStore } from './saas.store';

import {
  EstadoSuscripcion,
  Suscripcion
} from './saas.models';

// ============================================
// INTERFAZ DE METRICAS GLOBALES
// ============================================

export interface SaasResumen {
  tiendasTotal: number;
  tiendasActivas: number;
  tiendasPendientes: number;
  tiendasSuspendidas: number;

  propietariosActivos: number;

  planesActivos: number;
  dominiosTotal: number;

  suscripcionesTotal: number;
  suscripcionesActivas: number;
  suscripcionesPrueba: number;
  suscripcionesVencidas: number;
  suscripcionesCanceladas: number;
  suscripcionesVigentes: number;
  suscripcionesPorVencer: number;

  mrrEstimado: number;
}

// ============================================
// SERVICIO COMPARTIDO
// ============================================

@Injectable({
  providedIn: 'root'
})
export class SaasMetricsService {

  private readonly store = inject(SaasStore);

  private readonly db = this.store.data;

  // ==========================================
  // FECHA LOCAL YYYY-MM-DD
  // ==========================================

  fechaHoy(): string {
    const fecha = new Date();

    const anio = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      fecha.getDate()
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  // ==========================================
  // DIAS RESTANTES
  // ==========================================

  diasRestantes(fecha: string): number {
    const destino = fecha.slice(0, 10);
    const hoy = this.fechaHoy();

    const patron = /^\d{4}-\d{2}-\d{2}$/;

    if (!patron.test(destino)) {
      return -1;
    }

    const destinoMs = Date.parse(
      `${destino}T12:00:00Z`
    );

    const hoyMs = Date.parse(
      `${hoy}T12:00:00Z`
    );

    if (
      !Number.isFinite(destinoMs) ||
      !Number.isFinite(hoyMs)
    ) {
      return -1;
    }

    return Math.round(
      (destinoMs - hoyMs) / 86400000
    );
  }

  // ==========================================
  // ESTADO EFECTIVO DE SUSCRIPCION
  // ==========================================

  estadoEfectivo(
    suscripcion: Suscripcion
  ): EstadoSuscripcion {

    if (suscripcion.estado === 'CANCELADA') {
      return 'CANCELADA';
    }

    if (suscripcion.estado === 'VENCIDA') {
      return 'VENCIDA';
    }

    const vencimiento =
      suscripcion.vencimiento.slice(0, 10);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(vencimiento) ||
      vencimiento < this.fechaHoy()
    ) {
      return 'VENCIDA';
    }

    return suscripcion.estado;
  }

  // ==========================================
  // SUSCRIPCION VIGENTE
  // ==========================================

  estaVigente(
    suscripcion: Suscripcion
  ): boolean {

    const estado = this.estadoEfectivo(
      suscripcion
    );

    return (
      estado === 'ACTIVA' ||
      estado === 'PRUEBA'
    );
  }

  // ==========================================
  // PROXIMO VENCIMIENTO
  // ==========================================

  vencePronto(
    suscripcion: Suscripcion,
    limiteDias = 15
  ): boolean {

    if (!this.estaVigente(suscripcion)) {
      return false;
    }

    const dias = this.diasRestantes(
      suscripcion.vencimiento
    );

    return (
      dias >= 0 &&
      dias <= limiteDias
    );
  }

  // ==========================================
  // PRECIO MENSUAL DEL PLAN
  // ==========================================

  precioPlan(planId: string): number {

    return this.db().planes.find(
      plan => plan.id === planId
    )?.precioMensual ?? 0;
  }

  // ==========================================
  // SUSCRIPCION REPRESENTATIVA DE UNA TIENDA
  // ==========================================

  suscripcionDeTienda(
    tiendaId: string
  ): Suscripcion | undefined {

    const registros = this.db().suscripciones
      .filter(
        suscripcion =>
          suscripcion.tiendaId === tiendaId
      );

    return registros.sort((a, b) => {

      const vigenteA = this.estaVigente(a) ? 1 : 0;
      const vigenteB = this.estaVigente(b) ? 1 : 0;

      if (vigenteA !== vigenteB) {
        return vigenteB - vigenteA;
      }

      return b.vencimiento.localeCompare(
        a.vencimiento
      );

    })[0];
  }

  // ==========================================
  // RESUMEN REACTIVO
  // ==========================================

  readonly resumen = computed<SaasResumen>(() => {

    const datos = this.db();

    const suscripciones = datos.suscripciones;

    const activas = suscripciones.filter(
      item =>
        this.estadoEfectivo(item) === 'ACTIVA'
    );

    const pruebas = suscripciones.filter(
      item =>
        this.estadoEfectivo(item) === 'PRUEBA'
    );

    const vencidas = suscripciones.filter(
      item =>
        this.estadoEfectivo(item) === 'VENCIDA'
    );

    const canceladas = suscripciones.filter(
      item =>
        this.estadoEfectivo(item) === 'CANCELADA'
    );

    const porVencer = suscripciones.filter(
      item => this.vencePronto(item)
    );

    // Proyeccion DEMO, no pagos recibidos.
    const mrrEstimado = activas.reduce(
      (total, suscripcion) => {

        const plan = datos.planes.find(
          p => p.id === suscripcion.planId
        );

        return total + (plan?.precioMensual ?? 0);
      },
      0
    );

    return {

      tiendasTotal: datos.tiendas.length,

      tiendasActivas: datos.tiendas.filter(
        tienda => tienda.estado === 'ACTIVA'
      ).length,

      tiendasPendientes: datos.tiendas.filter(
        tienda => tienda.estado === 'PENDIENTE'
      ).length,

      tiendasSuspendidas: datos.tiendas.filter(
        tienda => tienda.estado === 'SUSPENDIDA'
      ).length,

      propietariosActivos: datos.propietarios.filter(
        propietario => propietario.estado === 'ACTIVO'
      ).length,

      planesActivos: datos.planes.filter(
        plan => plan.activo
      ).length,

      dominiosTotal: datos.dominios.length,

      suscripcionesTotal: suscripciones.length,

      suscripcionesActivas: activas.length,

      suscripcionesPrueba: pruebas.length,

      suscripcionesVencidas: vencidas.length,

      suscripcionesCanceladas: canceladas.length,

      suscripcionesVigentes:
        activas.length + pruebas.length,

      suscripcionesPorVencer: porVencer.length,

      mrrEstimado
    };
  });
}
