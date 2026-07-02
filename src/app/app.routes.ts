import { Routes } from '@angular/router';
import { roleGuard } from './core/auth/role.guard';
import { bootstrapGuard } from './core/auth/bootstrap.guard';

/**
 * Mapa de rutas por rol:
 *  - `/` es la vista del cliente (menú QR): pública, sin autenticación, con el
 *    login del personal en el footer, como pide el flujo del producto.
 *  - `/mesa/:numero` es la URL que codifica el QR físico de cada mesa.
 *  - `/admin`, `/mesero` y `/cocina` van protegidas por rol; el admin puede
 *    entrar a todas.
 * Lazy loading en todas las features para un primer paint mínimo del menú.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/client/client-home.component').then((m) => m.ClientHomeComponent),
  },
  {
    path: 'mesa/:numero',
    loadComponent: () => import('./features/client/client-home.component').then((m) => m.ClientHomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    // Alta del administrador propietario; el guard la cierra en cuanto existe uno.
    path: 'registro-inicial',
    canActivate: [bootstrapGuard],
    loadComponent: () =>
      import('./features/auth/register-admin.component').then((m) => m.RegisterAdminComponent),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('admin')],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'mesero',
    canActivate: [roleGuard('mesero')],
    loadComponent: () => import('./features/waiter/waiter.component').then((m) => m.WaiterComponent),
  },
  {
    path: 'cocina',
    canActivate: [roleGuard('cocina')],
    loadComponent: () => import('./features/kitchen/kitchen.component').then((m) => m.KitchenComponent),
  },
  {
    path: 'cajero',
    canActivate: [roleGuard('cajero')],
    loadComponent: () => import('./features/cashier/cashier.component').then((m) => m.CashierComponent),
  },
  { path: '**', redirectTo: '' },
];
