import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';

import {
  PropietariosApiService,
  PropietarioResumen,
  CandidatoPropietario,
  CuentaPropietarioResponse,
  CrearPropietarioRequest,
  EditarCuentaPropietarioRequest
} from '../../../../core/services/propietarios-api.service';

// Sebas Collection SaaS V2
// Pantalla real de propietarios (Spring Boot + Supabase).
// El HTML y los estilos se mantienen en archivos independientes.

type ModoFormulario = 'crear' | 'asignar' | 'editar' | null;

interface FormularioPropietario {
  tiendaId: number | null;
  usuarioId: number | null;
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
}

interface ConfirmacionEstado {
  tiendaId: number;
  tiendaNombre: string;
  propietarioNombre: string;
  activar: boolean;
}

function nuevoFormulario(): FormularioPropietario {
  return {
    tiendaId: null,
    usuarioId: null,
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: ''
  };
}

@Component({
  selector: 'app-propietarios-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './propietarios.page.html',
  styleUrl: './propietarios.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropietariosPage implements OnInit {

  private readonly api = inject(PropietariosApiService);

  readonly propietarios = signal<PropietarioResumen[]>([]);
  readonly candidatos = signal<CandidatoPropietario[]>([]);

  readonly cargando = signal(false);
  readonly cargado = signal(false);
  readonly guardando = signal(false);
  readonly cargandoDetalle = signal(false);
  readonly cargandoCandidatos = signal(false);

  readonly error = signal('');
  readonly mensaje = signal('');
  readonly busqueda = signal('');
  readonly pagina = signal(1);
  readonly modo = signal<ModoFormulario>(null);
  readonly seleccionada = signal<PropietarioResumen | null>(null);
  readonly confirmacion = signal<ConfirmacionEstado | null>(null);

  readonly tamanoPagina = 8;
  form: FormularioPropietario = nuevoFormulario();

  readonly asignadas = computed(() =>
    this.propietarios().filter(p => p.usuarioId !== null).length
  );

  readonly sinAsignar = computed(() =>
    this.propietarios().filter(p => p.usuarioId === null).length
  );

  readonly activos = computed(() =>
    this.propietarios().filter(p =>
      p.usuarioId !== null && p.activo === true
    ).length
  );

  readonly filtrados = computed(() => {
    const buscar = this.busqueda().trim().toLowerCase();
    if (!buscar) return this.propietarios();

    return this.propietarios().filter(p => {
      const texto = [
        p.tiendaNombre,
        p.subdominio,
        p.nombre,
        p.apellido,
        p.correo,
        p.estadoTienda
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return texto.includes(buscar);
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / this.tamanoPagina))
  );

  readonly paginaActual = computed(() => {
    const inicio = (this.pagina() - 1) * this.tamanoPagina;
    return this.filtrados().slice(inicio, inicio + this.tamanoPagina);
  });

  ngOnInit(): void {
    this.cargarPropietarios();
  }

  cargarPropietarios(): void {
    if (this.cargando() || this.guardando()) return;

    this.cargando.set(true);
    this.error.set('');

    this.api.listar()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: registros => {
          this.cargado.set(true);
          this.propietarios.set(Array.isArray(registros) ? registros : []);
          if (this.pagina() > this.totalPaginas()) {
            this.pagina.set(this.totalPaginas());
          }
        },
        error: err => {
          // Nunca mostrar datos DEMO como alternativa.
          this.cargado.set(false);
          this.propietarios.set([]);
          this.error.set(this.mensajeError(err));
        }
      });
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor ?? '');
    this.pagina.set(1);
  }

  cambiarPagina(numero: number): void {
    if (numero < 1 || numero > this.totalPaginas()) return;
    this.pagina.set(numero);
  }

  nombreCompleto(p: PropietarioResumen): string {
    return [p.nombre, p.apellido]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Sin nombre';
  }

  limpiarMensajes(): void {
    this.error.set('');
    this.mensaje.set('');
  }

  abrirCrear(p: PropietarioResumen): void {
    if (this.guardando()) return;

    if (p.usuarioId !== null) {
      this.error.set('Esta tienda ya tiene un propietario asignado.');
      return;
    }

    this.limpiarMensajes();
    this.form = nuevoFormulario();
    this.form.tiendaId = p.tiendaId;
    this.seleccionada.set(p);
    this.modo.set('crear');
  }

  abrirEditar(p: PropietarioResumen): void {
    if (this.guardando() || p.usuarioId === null) return;

    this.limpiarMensajes();
    this.form = nuevoFormulario();
    this.seleccionada.set(p);
    this.modo.set('editar');
    this.cargandoDetalle.set(true);

    this.api.obtenerCuenta(p.tiendaId)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: cuenta => {
          if (
            this.modo() !== 'editar' ||
            this.seleccionada()?.tiendaId !== p.tiendaId
          ) return;

          this.form = {
            tiendaId: cuenta.tiendaId,
            usuarioId: cuenta.usuarioId,
            nombre: cuenta.nombre,
            apellido: cuenta.apellido,
            correo: cuenta.correo,
            contrasena: ''
          };
        },
        error: err => {
          if (this.seleccionada()?.tiendaId !== p.tiendaId) return;
          this.limpiarFormularioInterno();
          this.error.set(this.mensajeError(err));
        }
      });
  }

  abrirAsignar(p: PropietarioResumen): void {
    if (this.guardando()) return;

    this.limpiarMensajes();
    this.form = nuevoFormulario();
    this.form.tiendaId = p.tiendaId;
    this.seleccionada.set(p);
    this.modo.set('asignar');
    this.candidatos.set([]);
    this.cargandoCandidatos.set(true);

    this.api.candidatos(p.tiendaId)
      .pipe(finalize(() => this.cargandoCandidatos.set(false)))
      .subscribe({
        next: registros => {
          if (
            this.modo() !== 'asignar' ||
            this.seleccionada()?.tiendaId !== p.tiendaId
          ) return;

          const lista = Array.isArray(registros) ? registros : [];
          this.candidatos.set(lista);
          const actual = lista.find(c => c.usuarioId === p.usuarioId);
          this.form.usuarioId = actual?.usuarioId ?? null;
        },
        error: err => {
          if (this.seleccionada()?.tiendaId !== p.tiendaId) return;
          this.candidatos.set([]);
          this.error.set(this.mensajeError(err));
        }
      });
  }

  guardarFormulario(): void {
    if (this.guardando() || this.cargandoDetalle() || this.cargandoCandidatos()) {
      return;
    }

    this.limpiarMensajes();
    const tiendaId = this.form.tiendaId;

    if (tiendaId === null || !Number.isSafeInteger(tiendaId) || tiendaId <= 0) {
      this.error.set('No se seleccionó una tienda válida.');
      return;
    }

    switch (this.modo()) {
      case 'crear':
        this.guardarNuevo(tiendaId);
        break;
      case 'editar':
        this.guardarEdicion(tiendaId);
        break;
      case 'asignar':
        this.guardarAsignacion(tiendaId);
        break;
    }
  }

  private guardarNuevo(tiendaId: number): void {
    if (!this.validarDatos()) return;

    const contrasena = this.form.contrasena;
    const bytes = new TextEncoder().encode(contrasena).length;

    if (bytes < 12 || bytes > 72) {
      this.error.set('La contraseña debe tener entre 12 y 72 bytes UTF-8.');
      return;
    }

    const datos: CrearPropietarioRequest = {
      tiendaId,
      nombre: this.form.nombre.trim(),
      apellido: this.form.apellido.trim(),
      correo: this.form.correo.trim().toLowerCase(),
      contrasena
    };

    this.ejecutar(this.api.crear(datos), registro => {
      this.actualizarFila(registro);
      this.limpiarFormularioInterno();
      this.mensaje.set('Propietario registrado correctamente.');
    });
  }

  private guardarEdicion(tiendaId: number): void {
    if (!this.validarDatos()) return;

    const datos: EditarCuentaPropietarioRequest = {
      nombre: this.form.nombre.trim(),
      apellido: this.form.apellido.trim(),
      correo: this.form.correo.trim().toLowerCase()
    };

    this.ejecutar(this.api.editarCuenta(tiendaId, datos), cuenta => {
      this.actualizarCuenta(cuenta);
      this.limpiarFormularioInterno();
      this.mensaje.set('Datos del propietario actualizados correctamente.');
    });
  }

  private guardarAsignacion(tiendaId: number): void {
    const usuarioId = this.form.usuarioId;

    if (usuarioId === null || !Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
      this.error.set('Selecciona un administrador válido.');
      return;
    }

    const candidatoValido = this.candidatos().some(c => c.usuarioId === usuarioId);
    if (!candidatoValido) {
      this.error.set('El administrador no está disponible para esta tienda.');
      return;
    }

    this.ejecutar(this.api.asignar(tiendaId, usuarioId), registro => {
      this.actualizarFila(registro);
      this.limpiarFormularioInterno();
      this.mensaje.set('Propietario asignado correctamente.');
    });
  }

  private validarDatos(): boolean {
    const nombre = this.form.nombre.trim();
    const apellido = this.form.apellido.trim();
    const correo = this.form.correo.trim();

    if (
      nombre.length < 2 || nombre.length > 100 ||
      apellido.length < 2 || apellido.length > 100
    ) {
      this.error.set('Nombre y apellido deben tener entre 2 y 100 caracteres.');
      return false;
    }

    if (correo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.error.set('Correo electrónico inválido.');
      return false;
    }

    return true;
  }

  solicitarEstado(p: PropietarioResumen, activar: boolean): void {
    if (this.guardando() || p.usuarioId === null || p.activo === activar) return;

    this.limpiarMensajes();
    this.confirmacion.set({
      tiendaId: p.tiendaId,
      tiendaNombre: p.tiendaNombre,
      propietarioNombre: this.nombreCompleto(p),
      activar
    });
  }

  cancelarEstado(): void {
    if (!this.guardando()) this.confirmacion.set(null);
  }

  confirmarEstado(): void {
    if (this.guardando()) return;
    const actual = this.confirmacion();
    if (!actual) return;

    this.limpiarMensajes();
    this.ejecutar(
      this.api.cambiarEstadoCuenta(actual.tiendaId, actual.activar),
      cuenta => {
        this.actualizarCuenta(cuenta);
        this.confirmacion.set(null);
        this.mensaje.set(
          actual.activar
            ? 'Acceso del propietario activado.'
            : 'Acceso del propietario desactivado.'
        );
      }
    );
  }

  private ejecutar<T>(peticion: Observable<T>, alCompletar: (resultado: T) => void): void {
    this.guardando.set(true);

    peticion
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: resultado => alCompletar(resultado),
        error: err => {
          // No retener la contraseña después de una solicitud fallida.
          this.form.contrasena = '';
          this.error.set(this.mensajeError(err));
        }
      });
  }

  private actualizarFila(nuevo: PropietarioResumen): void {
    this.propietarios.update(registros =>
      registros.map(actual => actual.tiendaId === nuevo.tiendaId ? nuevo : actual)
    );
  }

  private actualizarCuenta(cuenta: CuentaPropietarioResponse): void {
    this.propietarios.update(registros =>
      registros.map(p => {
        if (p.tiendaId !== cuenta.tiendaId || p.usuarioId !== cuenta.usuarioId) {
          return p;
        }
        return {
          ...p,
          nombre: cuenta.nombre,
          apellido: cuenta.apellido,
          correo: cuenta.correo,
          activo: cuenta.activo
        };
      })
    );
  }

  cerrarFormulario(): void {
    if (this.guardando()) return;
    this.limpiarFormularioInterno();
  }

  private limpiarFormularioInterno(): void {
    this.form.contrasena = '';
    this.form = nuevoFormulario();
    this.modo.set(null);
    this.seleccionada.set(null);
    this.candidatos.set([]);
  }

  private mensajeError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      switch (err.status) {
        case 0:
          return 'No hay conexión con Spring Boot. Comprueba el backend y el proxy Angular.';
        case 400:
          return 'Los datos enviados no son válidos. Revisa el formulario.';
        case 401:
          return 'Tu sesión expiró. Inicia sesión nuevamente.';
        case 403:
          return 'Acceso denegado (403). Se requiere autorización SUPER_ADMIN.';
        case 404:
          return 'No se encontró el propietario solicitado.';
        case 409:
          return 'Existe un conflicto. Revisa si el correo ya está registrado.';
        case 500:
          return 'Error interno de Spring Boot (500). Revisa los logs del backend.';
        default:
          return `Error HTTP ${err.status}. No se pudo completar la operación.`;
      }
    }
    return 'Ocurrió un error inesperado.';
  }
}

// Conserva compatibilidad con rutas que importan este nombre.
export { PropietariosPage as PropietariosPageComponent };
