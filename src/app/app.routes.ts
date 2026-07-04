import { Routes } from '@angular/router';
import { roleGuard } from './core/auth/role.guard';
import { bootstrapGuard } from './core/auth/bootstrap.guard';

/**
 * Mapa de rutas:
 *  - `/` y `/mesa/:numero` — cliente del restaurante demo (o el único en mono-tenant).
 *  - `/r/:slug` y `/r/:slug/mesa/:numero` — cliente multi-tenant; el slug identifica al restaurante.
 *  - `/nuevo-restaurante` — bootstrap de un nuevo tenant (siempre accesible).
 *  - `/registro-inicial` — alias legacy; redirige al nuevo bootstrap multi-tenant.
 *  - `/admin`, `/mesero`, `/cocina`, `/cajero` — protegidos por rol.
 */
export const routes: Routes = [
  // ── Cliente (rutas multi-tenant) ──────────────────────────────────────────
  {
    path: 'r/:slug',
    loadComponent: () => import('./features/client/client-home.component').then((m) => m.ClientHomeComponent),
  },
  {
    path: 'r/:slug/mesa/:numero',
    loadComponent: () => import('./features/client/client-home.component').then((m) => m.ClientHomeComponent),
  },
  // ── Cliente (ruta raíz, compatible con demo y mono-tenant) ────────────────
  {
    path: '',
    loadComponent: () => import('./features/client/client-home.component').then((m) => m.ClientHomeComponent),
  },
  {
    path: 'mesa/:numero',
    loadComponent: () => import('./features/client/client-home.component').then((m) => m.ClientHomeComponent),
  },
  // ── Autenticación y bootstrap ─────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    // Crea un nuevo restaurante + primer admin; siempre accesible para permitir
    // múltiples tenants en el mismo despliegue.
    path: 'nuevo-restaurante',
    loadComponent: () =>
      import('./features/auth/register-admin.component').then((m) => m.RegisterAdminComponent),
  },
  {
    // Alias legado; el guard redirige si ya hay un admin para evitar re-registro.
    path: 'registro-inicial',
    canActivate: [bootstrapGuard],
    loadComponent: () =>
      import('./features/auth/register-admin.component').then((m) => m.RegisterAdminComponent),
  },
  // ── Panel de personal (protegido por rol) ─────────────────────────────────
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
