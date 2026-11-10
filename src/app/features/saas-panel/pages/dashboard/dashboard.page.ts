import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, timeout } from 'rxjs';

type Registro = Record<string, unknown>;
type Estado = 'ACTIVA' | 'PENDIENTE' | 'SUSPENDIDA';
interface EstadoGrafico { estado: Estado; nombre: string; cantidad: number; porcentaje: number; }
interface PlanGrafico { id: string; nombre: string; cantidad: number; porcentaje: number; }
interface TiendaVista { id: number; nombre: string; subdominio: string; propietario: string; plan: string; estado: string; creadaEn: string; }
interface EventoVista { id: number; usuario: string; accion: string; descripcion: string; fecha: string; }
interface Indicadores {
  tiendasTotal: number; tiendasActivas: number; tiendasPendientes: number;
  tiendasSuspendidas: number; propietariosActivos: number; suscripcionesActivas: number;
  dominiosTotal: number; mrrEstimado: number;
}

@Component({
  selector: 'app-saas-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrls: ['../../saas-ui.css', './dashboard.page.css']
})
export class DashboardPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly cargando = signal(false);
  readonly errores = signal<string[]>([]);
  readonly ultimaActualizacion = signal('');
  readonly indicadores = signal<Indicadores>({
    tiendasTotal: 0, tiendasActivas: 0, tiendasPendientes: 0,
    tiendasSuspendidas: 0, propietariosActivos: 0,
    suscripcionesActivas: 0, dominiosTotal: 0, mrrEstimado: 0
  });
  readonly distribucionEstados = signal<EstadoGrafico[]>([]);
  readonly distribucionPlanes = signal<PlanGrafico[]>([]);
  readonly ultimasTiendas = signal<TiendaVista[]>([]);
  readonly actividadReciente = signal<EventoVista[]>([]);

  ngOnInit(): void { this.cargar(); }

  // Aísla los fallos de cada endpoint y evita sustituirlos por cifras DEMO.
  cargar(): void {
    this.cargando.set(true);
    this.errores.set([]);
    const consultar = (ruta: string, modulo: string) =>
      this.http.get<unknown>(`/api/superadmin/${ruta}`).pipe(
        timeout(12000),
        catchError(error => {
          this.errores.update(actual => [...actual, `${modulo}: ${error.name === 'TimeoutError' ? 'tiempo de espera agotado' : 'HTTP ' + (error.status || 'sin conexión')}`]);
          return of(null);
        })
      );

    forkJoin({
      tiendas: consultar('tiendas?pagina=0&tamano=100', 'Tiendas'),
      propietarios: consultar('propietarios', 'Propietarios'),
      suscripciones: consultar('suscripciones', 'Suscripciones'),
      planes: consultar('planes', 'Planes'),
      dominios: consultar('dominios', 'Dominios'),
      actividad: consultar('actividad?limite=6', 'Actividad')
    }).subscribe({
      next: datos => {
        this.procesar(datos);
        this.cargando.set(false);
        this.ultimaActualizacion.set(new Date().toLocaleString('es-PE'));
      },
      error: () => {
        this.errores.update(actual => [...actual, 'No se pudieron procesar los datos del Dashboard.']);
        this.cargando.set(false);
      }
    });
  }

  private procesar(datos: Record<string, unknown>): void {
    const tiendas = this.lista(datos['tiendas'], 'tiendas', 'content', 'items');
    const propietarios = this.lista(datos['propietarios'], 'propietarios', 'content', 'items');
    const suscripciones = this.lista(datos['suscripciones'], 'suscripciones', 'content', 'items');
    const planes = this.lista(datos['planes'], 'planes', 'content', 'items');
    const dominios = this.lista(datos['dominios'], 'dominios', 'content', 'items');
    const actividad = this.lista(datos['actividad'], 'actividades', 'content', 'items');

    const total = this.numero(this.campo(this.objeto(datos['tiendas']), 'total')) ?? tiendas.length;
    const contar = (estado: Estado) => tiendas.filter(t => this.texto(this.campo(t, 'estado')) === estado).length;
    const activas = contar('ACTIVA');
    const pendientes = contar('PENDIENTE');
    const suspendidas = contar('SUSPENDIDA');
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    const activasSus = suscripciones.filter(s => {
      const estado = this.texto(this.campo(s, 'estado', 'estado_suscripcion')).toUpperCase();
      const inicio = this.fecha(this.campo(s, 'fecha_inicio', 'fechaInicio'));
      const fin = this.fecha(this.campo(s, 'fecha_fin', 'fechaFin', 'fecha_vencimiento'));
      return estado === 'ACTIVA' && (!inicio || inicio <= hoy) && (!fin || fin >= hoy);
    });
    const mrr = activasSus.reduce((totalAcum, s) => totalAcum +
      (this.numero(this.campo(s, 'precio_contratado', 'precioContratado')) ?? 0), 0);

    this.indicadores.set({
      tiendasTotal: total,
      tiendasActivas: activas,
      tiendasPendientes: pendientes,
      tiendasSuspendidas: suspendidas,
      propietariosActivos: propietarios.filter(p => this.booleano(this.campo(p, 'activo', 'propietario_activo'))).length,
      suscripcionesActivas: activasSus.length,
      dominiosTotal: dominios.length,
      mrrEstimado: mrr
    });

    this.distribucionEstados.set(([
      ['ACTIVA', 'Activas'], ['PENDIENTE', 'Pendientes'], ['SUSPENDIDA', 'Suspendidas']
    ] as const).map(([estado, nombre]) => ({
      estado, nombre, cantidad: contar(estado),
      porcentaje: total ? Math.round(contar(estado) * 100 / total) : 0
    })));

    const nombrePlan = (s: Registro): string => {
      const directo = this.texto(this.campo(s, 'plan_nombre', 'nombre_plan', 'planNombre', 'nombrePlan'));
      if (directo) return directo;
      const id = this.numero(this.campo(s, 'plan_id', 'planId'));
      const plan = planes.find(p => this.numero(this.campo(p, 'id')) === id);
      return plan ? this.texto(this.campo(plan, 'nombre')) : 'Sin plan identificado';
    };
    const resumenPlanes = new Map<string, number>();
    // Se cuentan las suscripciones vigentes, no los planes históricos inactivos.
    for (const sus of activasSus) {
      const nombre = nombrePlan(sus);
      resumenPlanes.set(nombre, (resumenPlanes.get(nombre) ?? 0) + 1);
    }
    this.distribucionPlanes.set([...resumenPlanes].map(([nombre, cantidad]) => ({
      id: nombre, nombre, cantidad,
      porcentaje: activasSus.length ? Math.round(cantidad * 100 / activasSus.length) : 0
    })).sort((a, b) => b.cantidad - a.cantidad));

    this.ultimasTiendas.set(tiendas.map(t => {
      const id = this.numero(this.campo(t, 'id')) ?? 0;
      const propietario = propietarios.find(p =>
        this.numero(this.campo(p, 'tiendaId', 'tienda_id')) === id);
      const sus = activasSus.find(s =>
        this.numero(this.campo(s, 'tienda_id', 'tiendaId')) === id);
      const nombre = propietario
        ? [this.texto(this.campo(propietario, 'nombre')), this.texto(this.campo(propietario, 'apellido'))].filter(Boolean).join(' ')
        : '';
      return {
        id,
        nombre: this.texto(this.campo(t, 'nombre')),
        subdominio: this.texto(this.campo(t, 'subdominio')),
        propietario: nombre || 'Sin propietario',
        plan: sus ? nombrePlan(sus) : 'Sin suscripción activa',
        estado: this.texto(this.campo(t, 'estado')),
        creadaEn: this.fecha(this.campo(t, 'creadaEn', 'creado_en', 'creadoEn'))
      };
    }).sort((a, b) => b.id - a.id).slice(0, 6));

    this.actividadReciente.set(actividad.map(a => ({
      id: this.numero(this.campo(a, 'id')) ?? 0,
      usuario: this.texto(this.campo(a, 'usuario')),
      accion: this.texto(this.campo(a, 'accion')),
      descripcion: this.texto(this.campo(a, 'descripcion')),
      fecha: this.texto(this.campo(a, 'creado_en', 'creadoEn'))
    })).slice(0, 5));
  }

  mostrarFecha(valor: string): string {
    if (!valor) return '—';
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString('es-PE');
  }

  private objeto(valor: unknown): Registro {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
      ? valor as Registro : {};
  }
  private lista(valor: unknown, ...claves: string[]): Registro[] {
    if (Array.isArray(valor)) return valor.filter(v => !!v && typeof v === 'object') as Registro[];
    const origen = this.objeto(valor);
    for (const clave of claves) {
      if (Array.isArray(origen[clave])) return this.lista(origen[clave]);
    }
    return [];
  }
  private campo(valor: Registro, ...claves: string[]): unknown {
    for (const clave of claves) {
      if (valor[clave] !== undefined && valor[clave] !== null) return valor[clave];
    }
    return null;
  }
  private texto(valor: unknown): string { return valor == null ? '' : String(valor); }
  private numero(valor: unknown): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  private booleano(valor: unknown): boolean {
    return valor === true || valor === 1 || valor === 'true' || valor === 't';
  }
  private fecha(valor: unknown): string {
    return valor == null ? '' : String(valor).slice(0, 10);
  }
}
