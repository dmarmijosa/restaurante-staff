/**
 * Layout del panel de administración: sidebar cacao con navegación (badge de
 * pedidos activos), tarjeta de usuario abajo y chip de estado
 * abierto/temporada arriba a la derecha — calcado del diseño.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { driver } from 'driver.js';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { ConnectSupabaseDialogComponent } from './connect-supabase/connect-supabase-dialog.component';
import { isRuntimeConfigured } from '../../core/data/supabase/runtime-config';
import { isSupabaseConfigured } from '../../core/data/supabase/supabase-client.service';
import { initialsOf } from '../../shared/ui-maps';

/** Marca en localStorage para no repetir el tour automático cada visita. */
const TOUR_SEEN_KEY = 'rs-admin-tour-seen';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StaffTopbarComponent, TranslatePipe, ConnectSupabaseDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-fondo">
      <app-staff-topbar />
      <div class="relative flex min-h-0 flex-1 items-stretch">

        <!-- Backdrop del cajón en móvil -->
        @if (sidebarOpen()) {
          <div
            class="fixed inset-0 z-30 bg-cacao/60 backdrop-blur-[2px] lg:hidden"
            (click)="sidebarOpen.set(false)"
            aria-hidden="true"
          ></div>
        }

        <!-- Sidebar: fijo en escritorio, cajón deslizante en móvil -->
        <aside
          class="fixed inset-y-0 left-0 z-40 flex w-60 flex-none flex-col overflow-y-auto
                 bg-cacao-panel px-2.5 pt-5 pb-4 text-lino-suave
                 transition-transform duration-200 ease-out
                 lg:static lg:z-auto lg:translate-x-0"
          [class.-translate-x-full]="!sidebarOpen()"
          [class.translate-x-0]="sidebarOpen()"
        >
          <!-- Cabecera del sidebar -->
          <div class="mb-4 px-2.5 pb-4" style="border-bottom: 1px solid rgba(255,255,255,.08)">
            <div class="font-serif text-[17px] font-semibold leading-snug text-lino">{{ store.settings().name }}</div>
            <div class="mt-0.5 text-[10.5px] text-lino-gris">{{ 'admin.panel' | translate }}</div>
          </div>

          <!-- Nav items con iconos -->
          <nav class="flex flex-col gap-0.5" aria-label="Secciones de administración">
            @for (item of navItems(); track item.path) {
              <a
                [routerLink]="item.path"
                [attr.data-tour]="item.path"
                (click)="sidebarOpen.set(false)"
                routerLinkActive="bg-lino/[.12] text-lino"
                class="group flex cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-lino-tenue
                       transition-colors duration-150 hover:bg-lino/[.08] hover:text-lino"
              >
                <span class="flex h-5 w-5 flex-none items-center justify-center opacity-70 group-[.active]:opacity-100"
                      [innerHTML]="navIcon(item.path)" aria-hidden="true"></span>
                <span class="flex-1 leading-none">{{ ('admin.nav.' + item.path) | translate }}</span>
                @if (item.badge) {
                  <span class="rounded-full bg-terracota px-[7px] py-px text-[10px] font-bold text-lino-calido">
                    {{ item.badge }}
                  </span>
                }
              </a>
            }
          </nav>

          <!-- Acciones secundarias -->
          <div class="mt-3 flex flex-col gap-1.5">
            <button
              type="button"
              (click)="startTour()"
              class="cursor-pointer rounded-[10px] border border-lino/15 bg-transparent px-2.5 py-2
                     text-[12px] font-medium text-lino-tenue transition-colors hover:bg-lino/[.08] hover:text-lino"
            >
              {{ 'admin.guide_btn' | translate }}
            </button>
            @if (demoMode) {
              <button
                type="button"
                data-testid="exit-demo-btn"
                (click)="showConnect.set(true)"
                class="cursor-pointer rounded-[10px] border-none bg-terracota px-2.5 py-2
                       text-[12px] font-bold text-lino-calido transition-colors hover:bg-terracota-hover"
              >
                {{ 'connect.exit_demo' | translate }}
              </button>
            }
          </div>

          <div class="flex-1"></div>

          <!-- Card de usuario -->
          <div class="rounded-[12px] bg-lino/[.07] px-3 py-2.5" style="border-top: 1px solid rgba(255,255,255,.06)">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-terracota text-[11px] font-bold text-lino-calido shadow-sm">
                {{ initials() }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[12.5px] font-semibold text-lino">{{ userName() }}</div>
                <div class="text-[10px] text-lino-gris">{{ 'admin.nav.area' | translate }}</div>
              </div>
              <button
                type="button"
                (click)="signOut()"
                class="cursor-pointer rounded-md border-none bg-transparent p-1 text-[10px] text-lino-gris transition-colors hover:text-lino"
                [attr.aria-label]="'topbar.sign_out' | translate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <!-- Área de contenido -->
        <main class="min-w-0 flex-1 overflow-y-auto bg-fondo px-4 pt-4 pb-12 sm:px-7 sm:pt-5">
          <!-- Topbar móvil: hamburguesa + nombre + chip estado -->
          <div class="mb-4 flex items-center gap-3 lg:hidden">
            <button
              type="button"
              (click)="sidebarOpen.set(!sidebarOpen())"
              [attr.aria-label]="'admin.menu' | translate"
              aria-haspopup="true"
              [attr.aria-expanded]="sidebarOpen()"
              class="flex h-9 w-9 items-center justify-center rounded-[10px] border border-borde bg-papel text-tinta shadow-sm transition-colors hover:bg-panal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <span class="flex-1 font-serif text-[17px] font-semibold text-tinta">{{ store.settings().name }}</span>
            <a
              routerLink="temporada"
              class="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              [class]="store.acceptingOrders() ? 'bg-oliva-bg text-oliva-texto' : 'bg-rojizo-bg text-rojizo-hover'"
            >
              <span class="h-[6px] w-[6px] rounded-full" [style.background]="store.acceptingOrders() ? '#7C905F' : '#B5493A'"></span>
              {{ openChipLabel() }}
            </a>
          </div>

          <!-- Chip de estado en desktop (esquina superior derecha) -->
          <div class="mb-4 hidden justify-end lg:flex">
            <a
              routerLink="temporada"
              class="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
              [class]="store.acceptingOrders() ? 'bg-oliva-bg text-oliva-texto' : 'bg-rojizo-bg text-rojizo-hover'"
            >
              <span class="h-[6px] w-[6px] rounded-full" [style.background]="store.acceptingOrders() ? '#7C905F' : '#B5493A'"></span>
              {{ openChipLabel() }}
            </a>
          </div>

          <router-outlet />
        </main>
      </div>
    </div>

    @if (showConnect()) {
      <app-connect-supabase-dialog (close)="showConnect.set(false)" />
    }
  `,
})
export class AdminLayoutComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  private auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  protected readonly userName = computed(() => this.auth.user()?.fullName ?? this.translate.instant('admin.nav.area'));
  protected readonly initials = computed(() => initialsOf(this.userName()));

  /** Solo en modo demo puro (sin claves, ni de build ni de runtime) se ofrece conectar. */
  protected readonly demoMode = !isSupabaseConfigured() && !isRuntimeConfigured();
  protected readonly showConnect = signal(false);
  /** Cajón del sidebar en móvil (en escritorio siempre visible). */
  protected readonly sidebarOpen = signal(false);

  protected readonly navItems = computed(() => [
    { path: 'resumen', badge: 0 },
    { path: 'plano', badge: 0 },
    { path: 'pedidos', badge: this.store.activeOrders().length },
    { path: 'historial', badge: 0 },
    { path: 'menu', badge: 0 },
    { path: 'categorias', badge: 0 },
    { path: 'meseros', badge: 0 },
    { path: 'horarios', badge: 0 },
    { path: 'pagos', badge: 0 },
    { path: 'temporada', badge: 0 },
    { path: 'ajustes', badge: 0 },
  ]);

  protected readonly openChipLabel = computed(() => {
    if (!this.store.acceptingOrders()) return this.translate.instant('admin.closed_chip');
    const season = this.store.settings().season;
    return this.translate.instant(season === 'alta' ? 'admin.open_alta' : 'admin.open_baja');
  });

  private readonly NAV_ICONS: Record<string, string> = {
    resumen:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17h7M14 20h4"/></svg>`,
    plano:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
    pedidos:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    historial:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    menu:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
    categorias: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    meseros:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
    horarios:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    pagos:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    temporada:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
    ajustes:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  };

  protected navIcon(path: string): string {
    return this.NAV_ICONS[path] ?? '';
  }

  ngOnInit(): void {
    void this.store.init();
    // Onboarding: la primera vez que un admin entra, se lanza el tour guiado.
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(TOUR_SEEN_KEY)) {
      setTimeout(() => this.startTour(), 600);
    }
  }

  /** Tour guiado (driver.js) que explica cada sección del panel, traducido. */
  protected startTour(): void {
    if (typeof document === 'undefined') return;
    const t = (key: string) => this.translate.instant(key);
    const steps = this.navItems()
      .filter((item) => document.querySelector(`[data-tour="${item.path}"]`))
      .map((item) => ({
        element: `[data-tour="${item.path}"]`,
        popover: {
          title: t(`admin.nav.${item.path}`),
          description: t(`admin.tour.${item.path}_desc`),
        },
      }));
    if (!steps.length) return;
    const tour = driver({
      showProgress: true,
      nextBtnText: t('admin.tour.next'),
      prevBtnText: t('admin.tour.prev'),
      doneBtnText: t('admin.tour.done'),
      steps: [
        {
          popover: {
            title: t('admin.tour.welcome_title'),
            description: t('admin.tour.welcome_desc'),
          },
        },
        ...steps,
        {
          popover: {
            title: t('admin.tour.multirestaurant_title'),
            description: t('admin.tour.multirestaurant_desc'),
          },
        },
      ],
      onDestroyed: () => {
        try {
          localStorage.setItem(TOUR_SEEN_KEY, '1');
        } catch {
          /* almacenamiento no disponible: no pasa nada */
        }
      },
    });
    tour.drive();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
