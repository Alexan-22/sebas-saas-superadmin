
import { Routes } from '@angular/router';

import {
  SaasShellComponent
} from './saas-shell.component';

export const SAAS_ROUTES: Routes = [
  {
    path: '',
    component: SaasShellComponent,

    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        title: 'Dashboard | Sebas SaaS',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page')
            .then(m => m.DashboardPage)
      },
      {
        path: 'tiendas',
        title: 'Tiendas | Sebas SaaS',
        loadComponent: () =>
          import('./pages/tiendas/tiendas.page')
            .then(m => m.TiendasPage)
      },
      {
        path: 'propietarios',
        title: 'Propietarios | Sebas SaaS',
        loadComponent: () =>
          import('./pages/propietarios/propietarios.page')
            .then(m => m.PropietariosPage)
      },
      {
        path: 'dominios',
        title: 'Dominios | Sebas SaaS',
        loadComponent: () =>
          import('./pages/dominios/dominios.page')
            .then(m => m.DominiosPage)
      },
      {
        path: 'planes',
        title: 'Planes | Sebas SaaS',
        loadComponent: () =>
          import('./pages/planes/planes.page')
            .then(m => m.PlanesPage)
      },
      {
        path: 'suscripciones',
        title: 'Suscripciones | Sebas SaaS',
        loadComponent: () =>
          import('./pages/suscripciones/suscripciones.page')
            .then(m => m.SuscripcionesPage)
      },
      {
        path: 'reportes',
        title: 'Reportes | Sebas SaaS',
        loadComponent: () =>
          import('./pages/reportes/reportes.page')
            .then(m => m.ReportesPage)
      },
      {
        path: 'actividad',
        title: 'Actividad | Sebas SaaS',
        loadComponent: () =>
          import('./pages/actividad/actividad.page')
            .then(m => m.ActividadPage)
      },
      {
        path: 'configuracion',
        title: 'Configuración | Sebas SaaS',
        loadComponent: () =>
          import('./pages/configuracion/configuracion.page')
            .then(m => m.ConfiguracionPage)
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];

