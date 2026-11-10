export interface TiendaDemo {
  id: number;
  nombre: string;
  dominio: string;
  propietario: string;
  plan: string;
  estado: 'ACTIVA' | 'PENDIENTE';
}

export const TIENDAS_DEMO: TiendaDemo[] = [
  {
    id: 1,
    nombre: 'Sebas Collection',
    dominio: 'sebascollection.com',
    propietario: 'Administrador principal',
    plan: 'Profesional',
    estado: 'ACTIVA'
  },
  {
    id: 2,
    nombre: 'Moda Maria',
    dominio: 'modamaria.com',
    propietario: 'Maria',
    plan: 'Basico',
    estado: 'ACTIVA'
  },
  {
    id: 3,
    nombre: 'Tech Store',
    dominio: 'techstore.pe',
    propietario: 'Carlos',
    plan: 'Basico',
    estado: 'PENDIENTE'
  }
];
