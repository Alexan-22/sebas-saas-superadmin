
import {
  Injectable,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

import {
  SaasDatabase,
  Tienda,
  Propietario,
  Plan,
  Dominio,
  Suscripcion,
  ConfiguracionSaas,
  EstadoTienda,
  EstadoPropietario,
  EstadoDominio,
  normalizarSubdominio,
  validarSubdominio,
  validarDominio
} from './saas.models';

// ======================================================
// CONFIGURACION DEL ALMACENAMIENTO LOCAL
// ======================================================

const STORAGE_KEY = 'sebas-saas-admin-demo-v1';

// ======================================================
// DATOS INICIALES DE DEMOSTRACION
// ======================================================

function demoInicial(): SaasDatabase {
  return {
    version: 1,

    // --------------------------------------------------
    // PROPIETARIOS
    // --------------------------------------------------

    propietarios: [
      {
        id: 'p1',
        nombre: 'Administradora Demo',
        email: 'admin.demo@example.com',
        telefono: '999000001',
        estado: 'ACTIVO',
        creadoEn: '2026-10-01'
      },
      {
        id: 'p2',
        nombre: 'María Demo',
        email: 'maria.demo@example.com',
        telefono: '999000002',
        estado: 'ACTIVO',
        creadoEn: '2026-10-03'
      },
      {
        id: 'p3',
        nombre: 'Carlos Demo',
        email: 'carlos.demo@example.com',
        telefono: '999000003',
        estado: 'INACTIVO',
        creadoEn: '2026-10-07'
      }
    ],

    // --------------------------------------------------
    // PLANES
    // --------------------------------------------------

    planes: [
      {
        id: 'plan-basico',
        nombre: 'Básico',
        descripcion: 'Para pequeños negocios',
        precioMensual: 39,
        maxUsuarios: 3,
        maxProductos: 100,
        activo: true
      },
      {
        id: 'plan-pro',
        nombre: 'Profesional',
        descripcion: 'Para negocios en crecimiento',
        precioMensual: 89,
        maxUsuarios: 10,
        maxProductos: 1000,
        activo: true
      },
      {
        id: 'plan-emp',
        nombre: 'Empresarial',
        descripcion: 'Para operaciones grandes',
        precioMensual: 179,
        maxUsuarios: 50,
        maxProductos: 10000,
        activo: true
      }
    ],

    // --------------------------------------------------
    // TIENDAS
    // --------------------------------------------------

    tiendas: [
      {
        id: 't1',
        nombre: 'Sebas Collection (DEMO)',
        subdominio: 'sebascollection',
        emailContacto: 'tienda.demo@example.com',
        propietarioId: 'p1',
        planId: 'plan-pro',
        estado: 'ACTIVA',
        creadaEn: '2026-10-01'
      },
      {
        id: 't2',
        nombre: 'Moda María (DEMO)',
        subdominio: 'modamaria',
        emailContacto: 'moda.demo@example.com',
        propietarioId: 'p2',
        planId: 'plan-basico',
        estado: 'ACTIVA',
        creadaEn: '2026-10-03'
      },
      {
        id: 't3',
        nombre: 'Tech Store (DEMO)',
        subdominio: 'techstore',
        emailContacto: 'tech.demo@example.com',
        propietarioId: 'p3',
        planId: 'plan-basico',
        estado: 'PENDIENTE',
        creadaEn: '2026-10-07'
      }
    ],

    // --------------------------------------------------
    // DOMINIOS
    // --------------------------------------------------

    dominios: [
      {
        id: 'd1',
        tiendaId: 't1',
        nombre: 'sebascollection.example.com',
        estado: 'VERIFICADO_DEMO',
        creadoEn: '2026-10-02'
      },
      {
        id: 'd2',
        tiendaId: 't2',
        nombre: 'modamaria.example.com',
        estado: 'PENDIENTE',
        creadoEn: '2026-10-04'
      }
    ],

    // --------------------------------------------------
    // SUSCRIPCIONES
    // --------------------------------------------------

    suscripciones: [
      {
        id: 's1',
        tiendaId: 't1',
        planId: 'plan-pro',
        estado: 'ACTIVA',
        inicio: '2026-10-01',
        vencimiento: '2026-11-01'
      },
      {
        id: 's2',
        tiendaId: 't2',
        planId: 'plan-basico',
        estado: 'ACTIVA',
        inicio: '2026-10-03',
        vencimiento: '2026-11-03'
      },
      {
        id: 's3',
        tiendaId: 't3',
        planId: 'plan-basico',
        estado: 'PRUEBA',
        inicio: '2026-10-07',
        vencimiento: '2026-11-07'
      }
    ],

    // --------------------------------------------------
    // ACTIVIDAD
    // --------------------------------------------------

    actividad: [
      {
        id: 'a1',
        fecha: '2026-10-07T10:00:00.000Z',
        accion: 'DEMO',
        detalle: 'Datos iniciales de demostración cargados.'
      }
    ],

    // --------------------------------------------------
    // CONFIGURACION
    // --------------------------------------------------

    configuracion: {
      nombrePlataforma: 'Sebas Collection SaaS',
      emailSoporte: 'soporte.demo@example.com',
      moneda: 'PEN',
      zonaHoraria: 'America/Lima',
      avisosCorreo: false
    }
  };
}

// ======================================================
// SERVICIO CENTRAL DEL PANEL SAAS
// ======================================================

@Injectable({
  providedIn: 'root'
})
export class SaasStore {

  private readonly browser = isPlatformBrowser(
    inject(PLATFORM_ID)
  );

  // Estado reactivo principal.
  private readonly estado = signal<SaasDatabase>(
    this.cargar()
  );

  // Las pantallas pueden leerlo, pero no modificarlo
  // directamente desde fuera de esta clase.
  readonly data = this.estado.asReadonly();

  // ====================================================
  // CARGAR DATOS
  // ====================================================

  private cargar(): SaasDatabase {

    if (!this.browser) {
      return demoInicial();
    }

    try {
      const guardado = localStorage.getItem(STORAGE_KEY);

      if (!guardado) {
        return demoInicial();
      }

      const parsed: unknown = JSON.parse(guardado);

      if (!parsed || typeof parsed !== 'object') {
        return demoInicial();
      }

      const db = parsed as Partial<SaasDatabase>;

      if (
        db.version !== 1 ||
        !Array.isArray(db.tiendas) ||
        !Array.isArray(db.propietarios) ||
        !Array.isArray(db.planes) ||
        !Array.isArray(db.dominios) ||
        !Array.isArray(db.suscripciones) ||
        !Array.isArray(db.actividad) ||
        !db.configuracion
      ) {
        return demoInicial();
      }

      return db as SaasDatabase;

    } catch {
      return demoInicial();
    }
  }

  // ====================================================
  // PERSISTIR CAMBIOS
  // ====================================================

  private persistir(db: SaasDatabase): void {

    this.estado.set(db);

    if (!this.browser) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(db)
      );
    } catch {
      // Puede ocurrir si el almacenamiento está
      // deshabilitado o no hay espacio disponible.
    }
  }

  // ====================================================
  // REGISTRAR ACTIVIDAD LOCAL
  // ====================================================

  private guardar(
    db: SaasDatabase,
    accion: string,
    detalle: string
  ): void {

    const actividad = [
      {
        id: this.id(),
        fecha: new Date().toISOString(),
        accion,
        detalle
      },
      ...db.actividad
    ].slice(0, 250);

    this.persistir({
      ...db,
      actividad
    });
  }

  // ====================================================
  // GENERAR IDENTIFICADORES DEMO
  // ====================================================

  private id(): string {
    return (
      'demo-' +
      Date.now() +
      '-' +
      Math.random().toString(36).slice(2, 9)
    );
  }

  // ====================================================
  // CREAR TIENDA
  // ====================================================

  agregarTienda(
    input: Omit<Tienda, 'id' | 'creadaEn'>
  ): void {

    const db = this.data();

    const subdominio = normalizarSubdominio(
      input.subdominio
    );

    if (!input.nombre.trim()) {
      throw new Error(
        'Ingresa el nombre del negocio.'
      );
    }

    if (
      input.emailContacto.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        input.emailContacto.trim()
      )
    ) {
      throw new Error(
        'El correo de contacto no es válido.'
      );
    }

    if (!validarSubdominio(subdominio)) {
      throw new Error(
        'El subdominio debe tener entre 3 y 40 caracteres válidos.'
      );
    }

    if (
      db.tiendas.some(
        t => t.subdominio === subdominio
      )
    ) {
      throw new Error(
        'El subdominio ya está registrado.'
      );
    }

    if (
      !db.planes.some(
        p => p.id === input.planId && p.activo
      )
    ) {
      throw new Error(
        'Selecciona un plan activo.'
      );
    }

    if (
      input.propietarioId &&
      !db.propietarios.some(
        p => p.id === input.propietarioId
      )
    ) {
      throw new Error(
        'El propietario no existe.'
      );
    }

    const tienda: Tienda = {
      ...input,
      id: this.id(),
      nombre: input.nombre.trim(),
      subdominio,
      emailContacto: input.emailContacto.trim(),
      creadaEn: new Date().toISOString().slice(0, 10)
    };

    this.guardar(
      {
        ...db,
        tiendas: [tienda, ...db.tiendas]
      },
      'TIENDA_CREADA',
      tienda.nombre
    );
  }

  // ====================================================
  // ACTUALIZAR TIENDA
  // ====================================================

  actualizarTienda(
    id: string,
    input: Omit<Tienda, 'id' | 'creadaEn'>
  ): void {

    const db = this.data();

    const anterior = db.tiendas.find(
      t => t.id === id
    );

    if (!anterior) {
      throw new Error('Tienda no encontrada.');
    }

    const subdominio = normalizarSubdominio(
      input.subdominio
    );

    if (!input.nombre.trim()) {
      throw new Error(
        'Ingresa el nombre del negocio.'
      );
    }

    if (
      input.emailContacto.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        input.emailContacto.trim()
      )
    ) {
      throw new Error(
        'El correo de contacto no es válido.'
      );
    }

    if (!validarSubdominio(subdominio)) {
      throw new Error(
        'Subdominio no válido.'
      );
    }

    if (
      db.tiendas.some(
        t => t.id !== id &&
          t.subdominio === subdominio
      )
    ) {
      throw new Error(
        'Ese subdominio ya está en uso.'
      );
    }

    if (
      !db.planes.some(
        p => p.id === input.planId
      )
    ) {
      throw new Error('El plan no existe.');
    }

    if (
      input.propietarioId &&
      !db.propietarios.some(
        p => p.id === input.propietarioId
      )
    ) {
      throw new Error(
        'El propietario no existe.'
      );
    }

    const tiendas = db.tiendas.map(t =>
      t.id === id
        ? {
            ...t,
            ...input,
            nombre: input.nombre.trim(),
            subdominio,
            emailContacto: input.emailContacto.trim()
          }
        : t
    );

    this.guardar(
      {
        ...db,
        tiendas
      },
      'TIENDA_EDITADA',
      input.nombre.trim()
    );
  }

  // ====================================================
  // CAMBIAR ESTADO DE TIENDA
  // ====================================================

  estadoTienda(
    id: string,
    estado: EstadoTienda
  ): void {

    const db = this.data();

    const tienda = db.tiendas.find(
      t => t.id === id
    );

    if (!tienda) {
      throw new Error('Tienda no encontrada.');
    }

    const tiendas = db.tiendas.map(t =>
      t.id === id
        ? { ...t, estado }
        : t
    );

    this.guardar(
      {
        ...db,
        tiendas
      },
      'ESTADO_TIENDA',
      `${tienda.nombre}: ${estado}`
    );
  }

  // ====================================================
  // CREAR O EDITAR PROPIETARIO
  // ====================================================

  guardarPropietario(
    input: Omit<Propietario, 'id' | 'creadoEn'>,
    id?: string
  ): void {

    const db = this.data();

    const email = input.email.trim().toLowerCase();

    if (input.nombre.trim().length < 3) {
      throw new Error(
        'El nombre necesita al menos 3 caracteres.'
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new Error(
        'Escribe un correo válido.'
      );
    }

    if (
      db.propietarios.some(
        p => p.id !== id &&
          p.email.toLowerCase() === email
      )
    ) {
      throw new Error(
        'Este correo ya existe.'
      );
    }

    const anterior = id
      ? db.propietarios.find(p => p.id === id)
      : undefined;

    if (id && !anterior) {
      throw new Error(
        'Propietario no encontrado.'
      );
    }

    const nuevo: Propietario = {
      ...input,
      id: id ?? this.id(),
      nombre: input.nombre.trim(),
      email,
      telefono: input.telefono.trim(),
      creadoEn:
        anterior?.creadoEn ??
        new Date().toISOString().slice(0, 10)
    };

    const propietarios = id
      ? db.propietarios.map(p =>
          p.id === id ? nuevo : p
        )
      : [nuevo, ...db.propietarios];

    this.guardar(
      {
        ...db,
        propietarios
      },
      id
        ? 'PROPIETARIO_EDITADO'
        : 'PROPIETARIO_CREADO',
      nuevo.nombre
    );
  }

  // ====================================================
  // CAMBIAR ESTADO DEL PROPIETARIO
  // ====================================================

  estadoPropietario(
    id: string,
    estado: EstadoPropietario
  ): void {

    const db = this.data();

    const propietario = db.propietarios.find(
      p => p.id === id
    );

    if (!propietario) {
      throw new Error(
        'Propietario no encontrado.'
      );
    }

    const propietarios = db.propietarios.map(p =>
      p.id === id
        ? { ...p, estado }
        : p
    );

    this.guardar(
      {
        ...db,
        propietarios
      },
      'ESTADO_PROPIETARIO',
      `${propietario.nombre}: ${estado}`
    );
  }

  // ====================================================
  // CREAR O EDITAR PLAN
  // ====================================================

  guardarPlan(
    input: Omit<Plan, 'id'>,
    id?: string
  ): void {

    const db = this.data();

    if (!input.nombre.trim()) {
      throw new Error(
        'Ingresa el nombre del plan.'
      );
    }

    if (
      !Number.isFinite(input.precioMensual) ||
      input.precioMensual < 0
    ) {
      throw new Error(
        'El precio no puede ser negativo.'
      );
    }

    if (
      !Number.isInteger(input.maxUsuarios) ||
      input.maxUsuarios < 1 ||
      !Number.isInteger(input.maxProductos) ||
      input.maxProductos < 1
    ) {
      throw new Error(
        'Los límites deben ser enteros positivos.'
      );
    }

    if (
      id &&
      !db.planes.some(p => p.id === id)
    ) {
      throw new Error('Plan no encontrado.');
    }

    const nuevo: Plan = {
      ...input,
      id: id ?? this.id(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion.trim()
    };

    const planes = id
      ? db.planes.map(p =>
          p.id === id ? nuevo : p
        )
      : [...db.planes, nuevo];

    this.guardar(
      {
        ...db,
        planes
      },
      id ? 'PLAN_EDITADO' : 'PLAN_CREADO',
      nuevo.nombre
    );
  }

  // ====================================================
  // CREAR O EDITAR DOMINIO
  // ====================================================

  guardarDominio(
    input: {
      tiendaId: string;
      nombre: string;
    },
    id?: string
  ): void {

    const db = this.data();

    const nombre = input.nombre.trim().toLowerCase();

    if (
      !db.tiendas.some(
        t => t.id === input.tiendaId
      )
    ) {
      throw new Error(
        'Selecciona una tienda.'
      );
    }

    if (!validarDominio(nombre)) {
      throw new Error(
        'Dominio no válido. Ejemplo: tienda.com'
      );
    }

    if (
      db.dominios.some(
        d => d.id !== id && d.nombre === nombre
      )
    ) {
      throw new Error(
        'El dominio ya está registrado.'
      );
    }

    const anterior = id
      ? db.dominios.find(d => d.id === id)
      : undefined;

    if (id && !anterior) {
      throw new Error(
        'Dominio no encontrado.'
      );
    }

    const nuevo: Dominio = {
      id: id ?? this.id(),
      tiendaId: input.tiendaId,
      nombre,
      estado: anterior?.estado ?? 'PENDIENTE',
      creadoEn:
        anterior?.creadoEn ??
        new Date().toISOString().slice(0, 10)
    };

    const dominios = id
      ? db.dominios.map(d =>
          d.id === id ? nuevo : d
        )
      : [nuevo, ...db.dominios];

    this.guardar(
      {
        ...db,
        dominios
      },
      id ? 'DOMINIO_EDITADO' : 'DOMINIO_AGREGADO',
      nombre
    );
  }

  // ====================================================
  // CAMBIAR ESTADO DE DOMINIO (SOLO DEMO)
  // ====================================================

  estadoDominio(
    id: string,
    estado: EstadoDominio
  ): void {

    const db = this.data();

    const dominio = db.dominios.find(
      d => d.id === id
    );

    if (!dominio) {
      throw new Error(
        'Dominio no encontrado.'
      );
    }

    const dominios = db.dominios.map(d =>
      d.id === id
        ? { ...d, estado }
        : d
    );

    this.guardar(
      {
        ...db,
        dominios
      },
      'DOMINIO_DEMO',
      `${dominio.nombre}: ${estado} (sin DNS real)`
    );
  }

  // ====================================================
  // CREAR O EDITAR SUSCRIPCION
  // ====================================================

  guardarSuscripcion(
    input: Omit<Suscripcion, 'id'>,
    id?: string
  ): void {

    const db = this.data();

    if (
      !db.tiendas.some(
        t => t.id === input.tiendaId
      )
    ) {
      throw new Error(
        'Selecciona una tienda.'
      );
    }

    if (
      !db.planes.some(
        p => p.id === input.planId
      )
    ) {
      throw new Error(
        'Selecciona un plan.'
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.inicio) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.vencimiento) ||
      Number.isNaN(
        Date.parse(input.inicio + 'T00:00:00Z')
      ) ||
      Number.isNaN(
        Date.parse(input.vencimiento + 'T00:00:00Z')
      ) ||
      input.vencimiento < input.inicio
    ) {
      throw new Error(
        'Las fechas de suscripción no son válidas.'
      );
    }

    if (
      id &&
      !db.suscripciones.some(s => s.id === id)
    ) {
      throw new Error(
        'Suscripción no encontrada.'
      );
    }

    const nueva: Suscripcion = {
      ...input,
      id: id ?? this.id()
    };

    const suscripciones = id
      ? db.suscripciones.map(s =>
          s.id === id ? nueva : s
        )
      : [nueva, ...db.suscripciones];

    this.guardar(
      {
        ...db,
        suscripciones
      },
      id
        ? 'SUSCRIPCION_EDITADA'
        : 'SUSCRIPCION_CREADA',
      `Suscripción DEMO: ${input.tiendaId}`
    );
  }

  // ====================================================
  // GUARDAR CONFIGURACION
  // ====================================================

  configurar(
    input: ConfiguracionSaas
  ): void {

    if (!input.nombrePlataforma.trim()) {
      throw new Error(
        'El nombre de plataforma es obligatorio.'
      );
    }

    const db = this.data();

    this.guardar(
      {
        ...db,
        configuracion: {
          ...input
        }
      },
      'CONFIGURACION_DEMO',
      'Preferencias locales actualizadas.'
    );
  }

  // ====================================================
  // RESTABLECER DATOS DE DEMOSTRACION
  // ====================================================

  restablecerDemo(): void {

    this.guardar(
      demoInicial(),
      'REINICIO_DEMO',
      'Se restauraron los registros de demostración.'
    );
  }

  // ====================================================
  // FUNCIONES AUXILIARES DE CONSULTA
  // ====================================================

  nombreTienda(id: string): string {
    return (
      this.data().tiendas.find(
        t => t.id === id
      )?.nombre ?? 'Tienda no encontrada'
    );
  }

  nombrePlan(id: string): string {
    return (
      this.data().planes.find(
        p => p.id === id
      )?.nombre ?? 'Plan no encontrado'
    );
  }

  nombrePropietario(
    id: string | null
  ): string {

    if (!id) {
      return 'Sin asignar';
    }

    return (
      this.data().propietarios.find(
        p => p.id === id
      )?.nombre ?? 'Propietario no encontrado'
    );
  }
}
