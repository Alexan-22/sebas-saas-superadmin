export type EstadoTienda =
  | 'ACTIVA'
  | 'PENDIENTE'
  | 'SUSPENDIDA';


export type EstadoPropietario =
| 'ACTIVO'
| 'INACTIVO';

export type EstadoDominio =
| 'PENDIENTE'
| 'VERIFICADO_DEMO'
| 'ERROR';

export type EstadoSuscripcion =
| 'PRUEBA'
| 'ACTIVA'
| 'VENCIDA'
| 'CANCELADA';

// ===================================================
// MODELO DE TIENDA
// ===================================================

export interface Tienda {
id: string;
nombre: string;
subdominio: string;
emailContacto: string;
propietarioId: string | null;
planId: string;
estado: EstadoTienda;
creadaEn: string;
}

// ===================================================
// MODELO DE PROPIETARIO
// ===================================================

export interface Propietario {
id: string;
nombre: string;
email: string;
telefono: string;
estado: EstadoPropietario;
creadoEn: string;
}

// ===================================================
// MODELO DE PLAN
// ===================================================

export interface Plan {
id: string;
nombre: string;
descripcion: string;
precioMensual: number;
maxUsuarios: number;
maxProductos: number;
activo: boolean;
}

// ===================================================
// MODELO DE DOMINIO
// ===================================================

export interface Dominio {
id: string;
tiendaId: string;
nombre: string;
estado: EstadoDominio;
creadoEn: string;
}

// ===================================================
// MODELO DE SUSCRIPCION
// ===================================================

export interface Suscripcion {
id: string;
tiendaId: string;
planId: string;
estado: EstadoSuscripcion;
inicio: string;
vencimiento: string;
}

// ===================================================
// HISTORIAL DE ACTIVIDAD LOCAL
// ===================================================

export interface RegistroActividad {
id: string;
fecha: string;
accion: string;
detalle: string;
}

// ===================================================
// CONFIGURACION DE LA PLATAFORMA
// ===================================================

export interface ConfiguracionSaas {
nombrePlataforma: string;
emailSoporte: string;
moneda: string;
zonaHoraria: string;
avisosCorreo: boolean;
}

// ===================================================
// BASE DE DATOS LOCAL DE DEMOSTRACION
// ===================================================

export interface SaasDatabase {
version: 1;
tiendas: Tienda[];
propietarios: Propietario[];
planes: Plan[];
dominios: Dominio[];
suscripciones: Suscripcion[];
actividad: RegistroActividad[];
configuracion: ConfiguracionSaas;
}

// ===================================================
// NORMALIZAR SUBDOMINIOS
// ===================================================

export function normalizarSubdominio(
  valor: string
): string {

  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ===================================================
// VALIDAR SUBDOMINIOS
// ===================================================

export function validarSubdominio(
  valor: string
): boolean {

  const subdominio = valor.trim().toLowerCase();

  // Longitud entre 3 y 40 caracteres.
  if (
    subdominio.length < 3 ||
    subdominio.length > 40
  ) {
    return false;
  }

  // Debe comenzar y terminar con letra o numero.
  // En el interior permite letras, numeros y guiones.
  const patron =
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  return patron.test(subdominio);
}

// ===================================================
// VALIDAR DOMINIOS
// ===================================================

export function validarDominio(
valor: string
): boolean {
return /^(?=.{4,253}$)(?:a-z0-9?.)+[a-z]{2,63}$/.test(
valor.toLowerCase()
);
}

// ===================================================
// PROTEGER VALORES PARA EXPORTAR CSV
// ===================================================

export function csvSeguro(
valor: unknown
): string {
let texto = String(valor ?? '');

if (/^[\s]*[=+-@]/.test(texto)) {
texto = "'" + texto;
}

return '"' + texto.replace(/"/g, '""') + '"';
}

// ===================================================
// DESCARGAR ARCHIVO CSV
// ===================================================

export function descargarCsv(
nombreArchivo: string,
cabeceras: string[],
filas: unknown[][]
): void {
const contenido =
'\uFEFF' +
[cabeceras, ...filas]
.map(fila =>
fila.map(csvSeguro).join(',')
)
.join('\r\n');

const blob = new Blob(
[contenido],
{ type: 'text/csv;charset=utf-8;' }
);

const url = URL.createObjectURL(blob);

const enlace = document.createElement('a');

enlace.href = url;
enlace.download = nombreArchivo;
enlace.click();

URL.revokeObjectURL(url);
}