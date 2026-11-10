
import { TestBed } from '@angular/core/testing';

import {
  signal,
  WritableSignal
} from '@angular/core';

import {
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';

import { SaasStore } from './saas.store';

import {
  SaasMetricsService
} from './saas-metrics.service';

import {
  Suscripcion
} from './saas.models';

// ==============================================
// TIPOS PARA LAS PRUEBAS
// ==============================================

// Obtenemos el tipo de base de datos directamente
// del SaasStore existente para evitar duplicarlo.
type BaseDatos = ReturnType<SaasStore['data']>;

// ==============================================
// FUNCIONES AUXILIARES DE FECHAS
// ==============================================

function fechaLocalHoy(): string {

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

function fechaEn(dias: number): string {

  const fecha = new Date(
    `${fechaLocalHoy()}T12:00:00Z`
  );

  fecha.setUTCDate(
    fecha.getUTCDate() + dias
  );

  return fecha.toISOString().slice(0, 10);
}

// ==============================================
// BASE DE DATOS FICTICIA
// ==============================================

function crearBaseDePrueba(): BaseDatos {

  const hoy = fechaEn(0);

  return {

    version: 1,

    // ==========================================
    // PROPIETARIOS
    // ==========================================

    propietarios: [

      {
        id: 'prop-1',
        nombre: 'Carlos Prueba',
        email: 'carlos@example.com',
        telefono: '900000001',
        estado: 'ACTIVO',
        creadoEn: hoy
      },

      {
        id: 'prop-2',
        nombre: 'Ana Prueba',
        email: 'ana@example.com',
        telefono: '900000002',
        estado: 'INACTIVO',
        creadoEn: hoy
      }

    ],

    // ==========================================
    // PLANES
    // ==========================================

    planes: [

      {
        id: 'plan-basico',
        nombre: 'Básico',
        descripcion: 'Plan de prueba',
        precioMensual: 50,
        maxUsuarios: 3,
        maxProductos: 100,
        activo: true
      },

      {
        id: 'plan-pro',
        nombre: 'Profesional',
        descripcion: 'Plan profesional de prueba',
        precioMensual: 120,
        maxUsuarios: 10,
        maxProductos: 1000,
        activo: false
      }

    ],

    // ==========================================
    // TIENDAS
    // ==========================================

    tiendas: [

      {
        id: 'tienda-1',
        nombre: 'Tienda Uno',
        subdominio: 'tiendauno',
        emailContacto: 'uno@example.com',
        propietarioId: 'prop-1',
        planId: 'plan-basico',
        estado: 'ACTIVA',
        creadaEn: hoy
      },

      {
        id: 'tienda-2',
        nombre: 'Tienda Dos',
        subdominio: 'tiendados',
        emailContacto: 'dos@example.com',
        propietarioId: 'prop-1',
        planId: 'plan-pro',
        estado: 'PENDIENTE',
        creadaEn: hoy
      },

      {
        id: 'tienda-3',
        nombre: 'Tienda Tres',
        subdominio: 'tiendatres',
        emailContacto: 'tres@example.com',
        propietarioId: 'prop-2',
        planId: 'plan-basico',
        estado: 'SUSPENDIDA',
        creadaEn: hoy
      },

      {
        id: 'tienda-4',
        nombre: 'Tienda Cuatro',
        subdominio: 'tiendacuatro',
        emailContacto: 'cuatro@example.com',
        propietarioId: null,
        planId: 'plan-pro',
        estado: 'ACTIVA',
        creadaEn: hoy
      }

    ],

    // ==========================================
    // DOMINIOS
    // ==========================================

    dominios: [

      {
        id: 'dominio-1',
        tiendaId: 'tienda-1',
        nombre: 'www.tiendauno.example.com',
        estado: 'PENDIENTE',
        creadoEn: hoy
      }

    ],

    // ==========================================
    // SUSCRIPCIONES
    // ==========================================

    suscripciones: [

      // ACTIVA, vence dentro de 30 dias.
      {
        id: 'sus-1',
        tiendaId: 'tienda-1',
        planId: 'plan-basico',
        estado: 'ACTIVA',
        inicio: fechaEn(-15),
        vencimiento: fechaEn(30)
      },

      // PRUEBA, vence dentro de 10 dias.
      {
        id: 'sus-2',
        tiendaId: 'tienda-2',
        planId: 'plan-pro',
        estado: 'PRUEBA',
        inicio: fechaEn(-2),
        vencimiento: fechaEn(10)
      },

      // Guardada como ACTIVA, pero ya vencio.
      {
        id: 'sus-3',
        tiendaId: 'tienda-3',
        planId: 'plan-basico',
        estado: 'ACTIVA',
        inicio: fechaEn(-50),
        vencimiento: fechaEn(-1)
      },

      // CANCELADA, aunque su fecha es futura.
      {
        id: 'sus-4',
        tiendaId: 'tienda-4',
        planId: 'plan-pro',
        estado: 'CANCELADA',
        inicio: fechaEn(-2),
        vencimiento: fechaEn(15)
      }

    ],

    // ==========================================
    // ACTIVIDAD
    // ==========================================

    actividad: [],

    // ==========================================
    // CONFIGURACION
    // ==========================================

    configuracion: {
      nombrePlataforma: 'Sebas Collection SaaS',
      emailSoporte: 'soporte@example.com',
      moneda: 'PEN',
      zonaHoraria: 'America/Lima',
      avisosCorreo: false
    }
  };
}

// ==============================================
// SUITE DE PRUEBAS
// ==============================================

describe('SaasMetricsService', () => {

  let metricas: SaasMetricsService;

  let datos: WritableSignal<BaseDatos>;

  // ==========================================
  // CONFIGURACION DE CADA PRUEBA
  // ==========================================

  beforeEach(() => {

    // Cada prueba obtiene una nueva base ficticia.
    datos = signal<BaseDatos>(
      crearBaseDePrueba()
    );

    // Sustituimos SaasStore por una señal local.
    // NO usamos el localStorage real del usuario.
    TestBed.configureTestingModule({

      providers: [

        {
          provide: SaasStore,
          useValue: {
            data: datos
          }
        }

      ]

    });

    metricas = TestBed.inject(
      SaasMetricsService
    );
  });

  // ==========================================
  // PRUEBA 1: CREACION DEL SERVICIO
  // ==========================================

  it(
    'debe crear el servicio de métricas',
    () => {

      expect(metricas).toBeTruthy();

    }
  );

  // ==========================================
  // PRUEBA 2: FECHA ACTUAL
  // ==========================================

  it(
    'debe devolver la fecha local en formato YYYY-MM-DD',
    () => {

      const hoy = metricas.fechaHoy();

      expect(hoy).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );

      expect(hoy).toBe(fechaLocalHoy());

    }
  );

  // ==========================================
  // PRUEBA 3: DIAS RESTANTES
  // ==========================================

  it(
    'debe calcular correctamente los días restantes',
    () => {

      expect(
        metricas.diasRestantes(fechaEn(0))
      ).toBe(0);

      expect(
        metricas.diasRestantes(fechaEn(5))
      ).toBe(5);

      expect(
        metricas.diasRestantes(fechaEn(15))
      ).toBe(15);

      expect(
        metricas.diasRestantes(fechaEn(-1))
      ).toBe(-1);

    }
  );

  // ==========================================
  // PRUEBA 4: FECHA INVALIDA
  // ==========================================

  it(
    'debe rechazar un formato de fecha inválido',
    () => {

      expect(
        metricas.diasRestantes('fecha-invalida')
      ).toBe(-1);

    }
  );

  // ==========================================
  // PRUEBA 5: SUSCRIPCION ACTIVA
  // ==========================================

  it(
    'debe reconocer una suscripción activa vigente',
    () => {

      const suscripcion = datos()
        .suscripciones.find(
          item => item.id === 'sus-1'
        )!;

      expect(
        metricas.estadoEfectivo(suscripcion)
      ).toBe('ACTIVA');

      expect(
        metricas.estaVigente(suscripcion)
      ).toBe(true);

    }
  );

  // ==========================================
  // PRUEBA 6: SUSCRIPCION VENCIDA POR FECHA
  // ==========================================

  it(
    'debe detectar vencimiento aunque el estado guardado sea ACTIVA',
    () => {

      const suscripcion = datos()
        .suscripciones.find(
          item => item.id === 'sus-3'
        )!;

      expect(suscripcion.estado).toBe('ACTIVA');

      expect(
        metricas.estadoEfectivo(suscripcion)
      ).toBe('VENCIDA');

      expect(
        metricas.estaVigente(suscripcion)
      ).toBe(false);

    }
  );

  // ==========================================
  // PRUEBA 7: CANCELACION TIENE PRIORIDAD
  // ==========================================

  it(
    'debe mantener CANCELADA aunque la fecha sea futura',
    () => {

      const suscripcion = datos()
        .suscripciones.find(
          item => item.id === 'sus-4'
        )!;

      expect(
        metricas.estadoEfectivo(suscripcion)
      ).toBe('CANCELADA');

      expect(
        metricas.estaVigente(suscripcion)
      ).toBe(false);

    }
  );

  // ==========================================
  // PRUEBA 8: ESTADO VENCIDA EXPLICITO
  // ==========================================

  it(
    'debe respetar el estado VENCIDA explícito',
    () => {

      const suscripcion: Suscripcion = {
        id: 'sus-extra',
        tiendaId: 'tienda-1',
        planId: 'plan-basico',
        estado: 'VENCIDA',
        inicio: fechaEn(-10),
        vencimiento: fechaEn(30)
      };

      expect(
        metricas.estadoEfectivo(suscripcion)
      ).toBe('VENCIDA');

    }
  );

  // ==========================================
  // PRUEBA 9: ALERTA DE VENCIMIENTO
  // ==========================================

  it(
    'debe avisar de vencimientos dentro de 15 días',
    () => {

      const suscripciones = datos().suscripciones;

      const activa = suscripciones.find(
        item => item.id === 'sus-1'
      )!;

      const prueba = suscripciones.find(
        item => item.id === 'sus-2'
      )!;

      const vencida = suscripciones.find(
        item => item.id === 'sus-3'
      )!;

      const cancelada = suscripciones.find(
        item => item.id === 'sus-4'
      )!;

      expect(
        metricas.vencePronto(activa)
      ).toBe(false);

      expect(
        metricas.vencePronto(prueba)
      ).toBe(true);

      expect(
        metricas.vencePronto(vencida)
      ).toBe(false);

      expect(
        metricas.vencePronto(cancelada)
      ).toBe(false);

    }
  );

  // ==========================================
  // PRUEBA 10: ESTADISTICAS GENERALES
  // ==========================================

  it(
    'debe calcular los indicadores generales',
    () => {

      const resumen = metricas.resumen();

      expect(resumen.tiendasTotal).toBe(4);

      expect(resumen.tiendasActivas).toBe(2);

      expect(resumen.tiendasPendientes).toBe(1);

      expect(resumen.tiendasSuspendidas).toBe(1);

      expect(resumen.propietariosActivos).toBe(1);

      expect(resumen.planesActivos).toBe(1);

      expect(resumen.dominiosTotal).toBe(1);

    }
  );

  // ==========================================
  // PRUEBA 11: ESTADISTICAS DE SUSCRIPCIONES
  // ==========================================

  it(
    'debe calcular las suscripciones por estado efectivo',
    () => {

      const resumen = metricas.resumen();

      expect(
        resumen.suscripcionesTotal
      ).toBe(4);

      expect(
        resumen.suscripcionesActivas
      ).toBe(1);

      expect(
        resumen.suscripcionesPrueba
      ).toBe(1);

      expect(
        resumen.suscripcionesVencidas
      ).toBe(1);

      expect(
        resumen.suscripcionesCanceladas
      ).toBe(1);

      expect(
        resumen.suscripcionesVigentes
      ).toBe(2);

      expect(
        resumen.suscripcionesPorVencer
      ).toBe(1);

    }
  );

  // ==========================================
  // PRUEBA 12: MRR DEMO
  // ==========================================

  it(
    'debe calcular el MRR solamente con suscripciones ACTIVA vigentes',
    () => {

      // Solo sus-1 está activa y vigente.
      // Plan Básico cuesta S/ 50.
      //
      // sus-2: PRUEBA -> no aporta al MRR.
      // sus-3: VENCIDA -> no aporta al MRR.
      // sus-4: CANCELADA -> no aporta al MRR.

      expect(
        metricas.resumen().mrrEstimado
      ).toBe(50);

    }
  );

  // ==========================================
  // PRUEBA 13: PRECIO DE PLANES
  // ==========================================

  it(
    'debe obtener los precios de los planes',
    () => {

      expect(
        metricas.precioPlan('plan-basico')
      ).toBe(50);

      expect(
        metricas.precioPlan('plan-pro')
      ).toBe(120);

      expect(
        metricas.precioPlan('plan-inexistente')
      ).toBe(0);

    }
  );

  // ==========================================
  // PRUEBA 14: SUSCRIPCION DE UNA TIENDA
  // ==========================================

  it(
    'debe preferir la suscripción vigente de una tienda',
    () => {

      // Agregamos un registro histórico a tienda-1.
      datos.update(base => ({

        ...base,

        suscripciones: [

          ...base.suscripciones,

          {
            id: 'sus-historica',
            tiendaId: 'tienda-1',
            planId: 'plan-basico',
            estado: 'VENCIDA',
            inicio: fechaEn(-60),
            vencimiento: fechaEn(-30)
          }

        ]
      }));

      const seleccionada =
        metricas.suscripcionDeTienda('tienda-1');

      expect(seleccionada?.id).toBe('sus-1');

      expect(
        metricas.suscripcionDeTienda('no-existe')
      ).toBeUndefined();

    }
  );

  // ==========================================
  // PRUEBA 15: REACTIVIDAD DE ANGULAR
  // ==========================================

  it(
    'debe actualizar los indicadores cuando cambia SaasStore',
    () => {

      const antes = metricas.resumen();

      expect(antes.tiendasTotal).toBe(4);

      expect(antes.suscripcionesActivas).toBe(1);

      expect(antes.mrrEstimado).toBe(50);

      // Simulamos crear una tienda y asignarle
      // una suscripción activa vigente.

      datos.update(base => ({

        ...base,

        tiendas: [

          ...base.tiendas,

          {
            ...base.tiendas[0]!,
            id: 'tienda-5',
            nombre: 'Nueva Tienda',
            subdominio: 'nuevatienda',
            estado: 'ACTIVA'
          }

        ],

        suscripciones: [

          ...base.suscripciones,

          {
            id: 'sus-5',
            tiendaId: 'tienda-5',
            planId: 'plan-basico',
            estado: 'ACTIVA',
            inicio: fechaEn(0),
            vencimiento: fechaEn(6)
          }

        ]
      }));

      // No llamamos manualmente a un método
      // para recalcular los indicadores.
      // El computed() debe responder a la señal.

      const despues = metricas.resumen();

      expect(despues.tiendasTotal).toBe(5);

      expect(despues.tiendasActivas).toBe(3);

      expect(
        despues.suscripcionesTotal
      ).toBe(5);

      expect(
        despues.suscripcionesActivas
      ).toBe(2);

      expect(
        despues.suscripcionesPorVencer
      ).toBe(2);

      expect(
        despues.mrrEstimado
      ).toBe(100);

    }
  );

  // ==========================================
  // PRUEBA 16: SIN REGISTROS
  // ==========================================

  it(
    'debe devolver indicadores en cero cuando no hay registros',
    () => {

      datos.update(base => ({

        ...base,

        tiendas: [],
        propietarios: [],
        planes: [],
        dominios: [],
        suscripciones: []

      }));

      const resumen = metricas.resumen();

      expect(resumen.tiendasTotal).toBe(0);

      expect(resumen.propietariosActivos).toBe(0);

      expect(
        resumen.suscripcionesTotal
      ).toBe(0);

      expect(
        resumen.suscripcionesPorVencer
      ).toBe(0);

      expect(resumen.mrrEstimado).toBe(0);

    }
  );

});
