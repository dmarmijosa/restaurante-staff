/**
 * Layout del panel de administración: sidebar cacao con navegación (badge de
 * pedidos activos), tarjeta de usuario abajo y chip de estado
 * abierto/temporada arriba a la derecha — calcado del diseño.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { driver } from 'driver.js';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { initialsOf } from '../../shared/ui-maps';

/** Marca en localStorage para no repetir el tour automático cada visita. */
const TOUR_SEEN_KEY = 'rs-admin-tour-seen';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StaffTopbarComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />
      <div class="flex min-h-0 flex-1 items-stretch">
        <!-- Sidebar -->
        <aside class="flex w-[236px] flex-none flex-col bg-cacao-panel px-3 pt-5 pb-4 text-lino-suave">
          <div class="mb-3.5 border-b border-lino/10 px-2.5 pt-0.5 pb-[18px]">
            <div class="font-serif text-lg font-semibold text-lino">{{ store.settings().name }}</div>
            <div class="mt-0.5 text-[11px] text-lino-gris">{{ 'admin.panel' | translate }}</div>
          </div>
          <nav class="flex flex-col gap-0.5" aria-label="Secciones de administración">
            @for (item of navItems(); track item.path) {
              <a
                [routerLink]="item.path"
                [attr.data-tour]="item.path"
                routerLinkActive="!bg-lino !text-cacao"
                class="flex cursor-pointer items-center gap-2 rounded-[9px] px-3 py-[9px] text-[13.5px] font-medium text-lino-tenue hover:opacity-90"
              >
                <span class="flex-1">{{ ('admin.nav.' + item.path) | translate }}</span>
                @if (item.badge) {
                  <span class="rounded-full bg-terracota px-[7px] py-px text-[10.5px] font-bold text-lino-calido">
                    {{ item.badge }}
                  </span>
                }
              </a>
            }
          </nav>
          <button
            type="button"
            (click)="startTour()"
            class="mt-3 cursor-pointer rounded-[9px] border-[1.5px] border-lino/20 bg-transparent px-3 py-2 text-[12px] font-semibold text-lino-tenue hover:bg-lino/10"
          >
            {{ 'admin.guide_btn' | translate }}
          </button>
          <div class="flex-1"></div>
          <div class="flex items-center gap-2.5 border-t border-lino/10 px-2.5 py-2.5">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full bg-terracota text-xs font-bold text-lino-calido"
            >
              {{ initials() }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[12.5px] font-semibold text-lino">{{ userName() }}</div>
              <div class="text-[10.5px] text-lino-gris">{{ 'admin.nav.area' | translate }}</div>
            </div>
            <button type="button" (click)="signOut()" class="cursor-pointer text-[10.5px] text-lino-gris hover:text-lino">
              {{ 'topbar.sign_out' | translate }}
            </button>
          </div>
        </aside>

        <!-- Contenido -->
        <main class="min-w-0 flex-1 overflow-y-auto px-8 pt-[22px] pb-10">
          <div class="mb-1 flex justify-end">
            <a
              routerLink="temporada"
              class="flex cursor-pointer items-center gap-[7px] rounded-full px-3 py-[5px] text-xs font-semibold"
              [class]="store.acceptingOrders() ? 'bg-oliva-bg text-oliva-texto' : 'bg-rojizo-bg text-rojizo-hover'"
            >
              <span
                class="h-[7px] w-[7px] rounded-full"
                [style.background]="store.acceptingOrders() ? '#7C905F' : '#B5493A'"
              ></span>
              <span>{{ openChipLabel() }}</span>
            </a>
          </div>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent implements OnInit {
  protected readonly store = inject(RestaurantStore);
  private auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  protected readonly userName = computed(() => this.auth.user()?.fullName ?? this.translate.instant('admin.nav.area'));
  protected readonly initials = computed(() => initialsOf(this.userName()));

  protected readonly navItems = computed(() => [
    { path: 'resumen', badge: 0 },
    { path: 'plano', badge: 0 },
    { path: 'pedidos', badge: this.store.activeOrders().length },
    { path: 'historial', badge: 0 },
    { path: 'menu', badge: 0 },
    { path: 'categorias', badge: 0 },
    { path: 'meseros', badge: 0 },
    { path: 'pagos', badge: 0 },
    { path: 'temporada', badge: 0 },
    { path: 'ajustes', badge: 0 },
  ]);

  protected readonly openChipLabel = computed(() => {
    if (!this.store.acceptingOrders()) return this.translate.instant('admin.closed_chip');
    const season = this.store.settings().season;
    return this.translate.instant(season === 'alta' ? 'admin.open_alta' : 'admin.open_baja');
  });

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
