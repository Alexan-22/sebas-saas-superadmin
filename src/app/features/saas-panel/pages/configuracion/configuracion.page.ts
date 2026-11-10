
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

interface ConfiguracionSaas {
  nombre_plataforma: string;
  correo_soporte: string;
  telefono_soporte: string;
  zona_horaria: string;
  dias_prueba: string;
  dias_alerta_vencimiento: string;
}

@Component({
  selector: 'app-saas-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.css']
})
export class ConfiguracionPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly api = '/api/superadmin/configuracion';

  configuracion: ConfiguracionSaas = {
    nombre_plataforma: '',
    correo_soporte: '',
    telefono_soporte: '',
    zona_horaria: 'America/Lima',
    dias_prueba: '14',
    dias_alerta_vencimiento: '15'
  };

  original: ConfiguracionSaas = { ...this.configuracion };
  cargando = false;
  guardando = false;
  mensaje = '';
  error = '';

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';

    this.http.get<ConfiguracionSaas>(this.api).subscribe({
      next: datos => {
        this.configuracion = { ...this.configuracion, ...datos };
        this.original = { ...this.configuracion };
        this.cargando = false;
      },
      error: e => {
        this.error = this.mensajeError(e);
        this.cargando = false;
      }
    });
  }

  get modificada(): boolean {
    return JSON.stringify(this.configuracion) !== JSON.stringify(this.original);
  }

  guardar(): void {
    if (this.guardando || this.cargando) return;

    const datos = this.configuracion;
    const prueba = Number(datos.dias_prueba);
    const alerta = Number(datos.dias_alerta_vencimiento);

    if (!datos.nombre_plataforma.trim()) {
      this.error = 'Ingresa el nombre de la plataforma.';
      return;
    }

    if (!Number.isInteger(prueba) || prueba < 0 || prueba > 365 ||
        !Number.isInteger(alerta) || alerta < 0 || alerta > 365) {
      this.error = 'Los días deben estar entre 0 y 365.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.http.put<ConfiguracionSaas>(this.api, datos).subscribe({
      next: respuesta => {
        this.configuracion = { ...respuesta };
        this.original = { ...respuesta };
        this.guardando = false;
        this.mensaje = 'Configuración guardada correctamente en Supabase.';
      },
      error: e => {
        this.guardando = false;
        this.error = this.mensajeError(e);
      }
    });
  }

  restaurar(): void {
    this.configuracion = { ...this.original };
    this.mensaje = '';
    this.error = '';
  }

  private mensajeError(e: HttpErrorResponse): string {
    if (e.status === 0) return 'No se pudo conectar con Spring Boot.';
    if (e.status === 400) return 'Revisa los valores de configuración.';
    if (e.status === 401) return 'Tu sesión ha vencido.';
    if (e.status === 403) return 'No tienes permisos para modificar la configuración.';
    return `No fue posible guardar la configuración (HTTP ${e.status}).`;
  }
}
