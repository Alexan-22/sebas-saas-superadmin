import { Routes } from '@angular/router';

import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },

  {
    path: 'login',
    title: 'Iniciar sesión | Super Admin SaaS',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.Login)
  },

  // PANEL SAAS V2 - PRINCIPAL Y PROTEGIDO
  {
    path: 'saas',
    canActivate: [superAdminGuard],
    data: { modoDemo: false },
    loadChildren: () =>
      import('./features/saas-panel/saas.routes')
        .then(m => m.SAAS_ROUTES)
  },

  // REDIRECCIONES DEL PANEL ANTIGUO
  {
    path: 'superadmin',
    pathMatch: 'full',
    redirectTo: 'saas'
  },

  {
    path: 'superadmin/tiendas',
    pathMatch: 'full',
    redirectTo: 'saas/tiendas'
  },

  {
    path: 'superadmin-v2',
    pathMatch: 'full',
    redirectTo: 'saas'
  },

  {
    path: 'demo',
    pathMatch: 'full',
    redirectTo: 'saas'
  },

  {
    path: 'demo/tiendas',
    pathMatch: 'full',
    redirectTo: 'saas/tiendas'
  },

  {
    path: 'demo-v2',
    pathMatch: 'full',
    redirectTo: 'saas'
  },

  {
    path: '**',
    redirectTo: 'login'
  }

];
