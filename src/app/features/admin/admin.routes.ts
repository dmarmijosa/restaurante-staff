import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

/**
 * Rutas hijas del panel de administración; cada sección del sidebar es una
 * ruta lazy para no cargar el plano (drag & drop) si el admin solo entra a
 * revisar pedidos.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'plano' },
      {
        path: 'plano',
        loadComponent: () => import('./floor-plan/floor-plan.component').then((m) => m.FloorPlanComponent),
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./orders/orders-board.component').then((m) => m.OrdersBoardComponent),
      },
      {
        path: 'menu',
        loadComponent: () => import('./menu/menu-products.component').then((m) => m.MenuProductsComponent),
      },
      {
        path: 'categorias',
        loadComponent: () => import('./categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'meseros',
        loadComponent: () => import('./staff/staff-page.component').then((m) => m.StaffPageComponent),
      },
      {
        path: 'temporada',
        loadComponent: () => import('./season/season.component').then((m) => m.SeasonComponent),
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
];
