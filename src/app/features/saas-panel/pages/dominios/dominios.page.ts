
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

type EstadoDominio = 'PENDIENTE' | 'VERIFICADO_DNS' | 'ERROR';

interface Tienda {
  id: number;
  nombre: string;
}

interface Dominio {
  id: number;
  tienda_id: number;
  tienda: string;
  nombre: string;
  estado: EstadoDominio;
  token_verificacion: string;
  creado_en: string;
  actualizado_en: string;
  verificado_en: string | null;
}

interface FormDominio {
  tiendaId: number | null;
  nombre: string;
}

@Component({
  selector: 'app-saas-dominios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dominios.page.html',
  styleUrls: ['./dominios.page.css']
})
export class DominiosPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/superadmin';

  dominios: Dominio[] = [];
  tiendas: Tienda[] = [];

  busqueda = '';
  filtroEstado = 'TODOS';
  filtroTienda = 'TODAS';
  orden = 'recientes';
  pagina = 0;
  readonly tamano = 8;

  cargando = false;
  guardando = false;
  verificando = false;
  eliminando = false;
  formVisible = false;
  editandoId: number | null = null;
  detalleId: number | null = null;
  eliminarId: number | null = null;

  mensaje = '';
  error = '';
  form: FormDominio = { tiendaId: null, nombre: '' };

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    forkJoin({
      dominios: this.http.get<Dominio[]>(`${this.api}/dominios`),
      tiendas: this.http.get<unknown>(`${this.api}/tiendas`)
    }).subscribe({
      next: ({ dominios, tiendas }) => {
        this.dominios = dominios;
        this.tiendas = this.extraerTiendas(tiendas);
        this.cargando = false;
      },
      error: e => {
        this.error = this.mensajeError(e);
        this.cargando = false;
      }
    });
  }

  private extraerTiendas(valor: unknown): Tienda[] {
    if (Array.isArray(valor)) return valor;

    if (valor && typeof valor === 'object') {
      const respuesta = valor as Record<string, unknown>;
      for (const clave of ['tiendas', 'content', 'items']) {
        if (Array.isArray(respuesta[clave])) return respuesta[clave] as Tienda[];
      }
    }

    return [];
  }

  dominioNormalizado(valor: string): string {
    return valor.trim().toLowerCase().replace(/\.$/, '');
  }

  dominioValido(valor: string): boolean {
    const dominio = this.dominioNormalizado(valor);
    return /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(dominio);
  }

  textoEstado(estado: EstadoDominio): string {
    if (estado === 'VERIFICADO_DNS') return 'DNS verificado';
    if (estado === 'ERROR') return 'Error';
    return 'Pendiente';
  }

  get estadisticas() {
    return {
      total: this.dominios.length,
      verificados: this.dominios.filter(d => d.estado === 'VERIFICADO_DNS').length,
      pendientes: this.dominios.filter(d => d.estado === 'PENDIENTE').length,
      errores: this.dominios.filter(d => d.estado === 'ERROR').length
    };
  }

  get filtrados(): Dominio[] {
    const q = this.busqueda.trim().toLowerCase();

    return this.dominios.filter(d =>
      (!q || `${d.nombre} ${d.tienda}`.toLowerCase().includes(q)) &&
      (this.filtroEstado === 'TODOS' || d.estado === this.filtroEstado) &&
      (this.filtroTienda === 'TODAS' || String(d.tienda_id) === this.filtroTienda)
    ).sort((a, b) => {
      if (this.orden === 'nombre-asc') return a.nombre.localeCompare(b.nombre);
      if (this.orden === 'nombre-desc') return b.nombre.localeCompare(a.nombre);
      if (this.orden === 'antiguos') return a.creado_en.localeCompare(b.creado_en);
      return b.creado_en.localeCompare(a.creado_en);
    });
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filtrados.length / this.tamano));
  }

  get paginaDominios(): Dominio[] {
    const pagina = Math.min(this.pagina, this.totalPaginas - 1);
    return this.filtrados.slice(pagina * this.tamano, (pagina + 1) * this.tamano);
  }

  get desde(): number {
    return this.filtrados.length ? this.pagina * this.tamano + 1 : 0;
  }

  get hasta(): number {
    return Math.min((this.pagina + 1) * this.tamano, this.filtrados.length);
  }

  get dominioDetalle(): Dominio | undefined {
    return this.dominios.find(d => d.id === this.detalleId);
  }

  get dominioPorEliminar(): Dominio | undefined {
    return this.dominios.find(d => d.id === this.eliminarId);
  }

  nueva(): void {
    this.form = { tiendaId: null, nombre: '' };
    this.editandoId = null;
    this.formVisible = true;
    this.detalleId = null;
    this.limpiarMensajes();
  }

  editar(dominio: Dominio): void {
    this.form = { tiendaId: dominio.tienda_id, nombre: dominio.nombre };
    this.editandoId = dominio.id;
    this.formVisible = true;
    this.detalleId = null;
    this.limpiarMensajes();
  }

  cerrarFormulario(): void {
    if (!this.guardando) {
      this.formVisible = false;
      this.editandoId = null;
    }
  }

  guardar(): void {
    if (this.guardando) return;

    const datos = {
      tiendaId: this.form.tiendaId,
      nombre: this.dominioNormalizado(this.form.nombre)
    };

    if (!datos.tiendaId || !this.tiendas.some(t => t.id === datos.tiendaId)) {
      this.error = 'Selecciona una tienda válida.';
      return;
    }

    if (!this.dominioValido(datos.nombre)) {
      this.error = 'Ingresa un dominio válido, por ejemplo tienda.ejemplo.com.';
      return;
    }

    const duplicado = this.dominios.some(d =>
      d.id !== this.editandoId && d.nombre === datos.nombre
    );

    if (duplicado) {
      this.error = 'Este dominio ya está registrado.';
      return;
    }

    this.guardando = true;
    this.error = '';

    const solicitud = this.editandoId
      ? this.http.put<Dominio>(`${this.api}/dominios/${this.editandoId}`, datos)
      : this.http.post<Dominio>(`${this.api}/dominios`, datos);

    solicitud.subscribe({
      next: dominio => {
        this.guardando = false;
        this.formVisible = false;
        this.editandoId = null;
        this.detalleId = dominio.id;
        this.mensaje = 'Dominio guardado. Ahora configura su registro DNS TXT.';
        this.cargar();
      },
      error: e => {
        this.guardando = false;
        this.error = this.mensajeError(e);
      }
    });
  }

  verDetalle(id: number): void {
    this.detalleId = id;
    this.formVisible = false;
    this.limpiarMensajes();
  }

  verificar(dominio: Dominio): void {
    if (this.verificando) return;

    this.verificando = true;
    this.error = '';

    this.http.post<Dominio>(`${this.api}/dominios/${dominio.id}/verificar`, {})
      .subscribe({
        next: () => {
          this.verificando = false;
          this.mensaje = 'Propiedad del dominio verificada mediante DNS TXT.';
          this.cargar();
        },
        error: e => {
          this.verificando = false;
          this.error = this.mensajeError(e);
        }
      });
  }

  prepararEliminar(id: number): void {
    this.eliminarId = id;
    this.limpiarMensajes();
  }

  confirmarEliminar(): void {
    if (!this.eliminarId || this.eliminando) return;

    this.eliminando = true;
    const id = this.eliminarId;

    this.http.delete(`${this.api}/dominios/${id}`).subscribe({
      next: () => {
        this.eliminando = false;
        this.eliminarId = null;
        this.detalleId = null;
        this.mensaje = 'Dominio eliminado del registro de la plataforma.';
        this.cargar();
      },
      error: e => {
        this.eliminando = false;
        this.error = this.mensajeError(e);
      }
    });
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = 'TODOS';
    this.filtroTienda = 'TODAS';
    this.orden = 'recientes';
    this.pagina = 0;
  }

  limpiarMensajes(): void {
    this.mensaje = '';
    this.error = '';
  }

  exportar(): void {
    const filas = [
      ['ID', 'Dominio', 'Tienda', 'Estado', 'Registrado'],
      ...this.filtrados.map(d => [
        String(d.id), d.nombre, d.tienda, d.estado, d.creado_en
      ])
    ];

    const celda = (valor: string) => {
      let texto = valor;
      if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const csv = '\uFEFF' + filas.map(f => f.map(celda).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = 'dominios-sebas-saas.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private mensajeError(e: HttpErrorResponse): string {
    if (e.status === 0) return 'No se pudo conectar con Spring Boot.';
    if (e.status === 401) return 'Tu sesión ha vencido.';
    if (e.status === 403) return 'No tienes permisos para esta operación.';
    if (e.status === 404) return 'No se encontró el endpoint o el dominio.';
    if (e.status === 409) return 'Dominio duplicado o registro TXT no encontrado.';
    return `No se completó la operación (HTTP ${e.status}).`;
  }
}
