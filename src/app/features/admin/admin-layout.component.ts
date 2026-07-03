/**
 * Layout del panel de administración: sidebar cacao con navegación (badge de
 * pedidos activos), tarjeta de usuario abajo y chip de estado
 * abierto/temporada arriba a la derecha — calcado del diseño.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { driver } from 'driver.js';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { initialsOf } from '../../shared/ui-maps';

/** Marca en localStorage para no repetir el tour automático cada visita. */
const TOUR_SEEN_KEY = 'rs-admin-tour-seen';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StaffTopbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-staff-topbar />
      <div class="flex min-h-0 flex-1 items-stretch">
        <!-- Sidebar -->
        <aside class="flex w-[236px] flex-none flex-col bg-cacao-panel px-3 pt-5 pb-4 text-lino-suave">
          <div class="mb-3.5 border-b border-lino/10 px-2.5 pt-0.5 pb-[18px]">
            <div class="font-serif text-lg font-semibold text-lino">{{ store.settings().name }}</div>
            <div class="mt-0.5 text-[11px] text-lino-gris">Panel de administración</div>
          </div>
          <nav class="flex flex-col gap-0.5" aria-label="Secciones de administración">
            @for (item of navItems(); track item.path) {
              <a
                [routerLink]="item.path"
                [attr.data-tour]="item.path"
                routerLinkActive="!bg-lino !text-cacao"
                class="flex cursor-pointer items-center gap-2 rounded-[9px] px-3 py-[9px] text-[13.5px] font-medium text-lino-tenue hover:opacity-90"
              >
                <span class="flex-1">{{ item.label }}</span>
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
            ✦ Ver guía del panel
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
              <div class="text-[10.5px] text-lino-gris">Administración</div>
            </div>
            <button type="button" (click)="signOut()" class="cursor-pointer text-[10.5px] text-lino-gris hover:text-lino">
              Salir
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

  protected readonly userName = computed(() => this.auth.user()?.fullName ?? 'Administración');
  protected readonly initials = computed(() => initialsOf(this.userName()));

  protected readonly navItems = computed(() => [
    { path: 'resumen', label: 'Resumen', badge: 0, tour: 'Vista rápida del día: ingresos cobrados, ticket medio, ventas por método de pago y productos más vendidos.' },
    { path: 'plano', label: 'Plano del salón', badge: 0, tour: 'Diseña el salón: arrastra mesas, ajusta sillas, fusiónalas e imprime el QR de cada una.' },
    { path: 'pedidos', label: 'Pedidos', badge: this.store.activeOrders().length, tour: 'Tablero en vivo de comandas por estado: recibido → preparando → listo → entregado.' },
    { path: 'historial', label: 'Historial', badge: 0, tour: 'Historial de pedidos y arqueo de caja (totales por método de pago) del periodo que elijas.' },
    { path: 'menu', label: 'Menú y productos', badge: 0, tour: 'Crea platillos, sube su foto y actívalos/desactívalos; el menú del cliente se actualiza al instante.' },
    { path: 'categorias', label: 'Categorías', badge: 0, tour: 'Organiza el menú en categorías (Entradas, Postres…).' },
    { path: 'meseros', label: 'Meseros y turnos', badge: 0, tour: 'Da de alta al equipo (mesero, cocina y cajero), asigna rol y turno, o da de baja (borrado permanente).' },
    { path: 'pagos', label: 'Métodos de pago', badge: 0, tour: 'Define cómo cobra el cajero: efectivo, tarjeta, transferencia o los que añadas.' },
    { path: 'temporada', label: 'Temporada y horario', badge: 0, tour: 'Abre/cierra el restaurante y define la temporada; controla si el QR acepta pedidos.' },
    { path: 'ajustes', label: 'Ajustes', badge: 0, tour: 'Nombre y logo del restaurante y cuentas de administración.' },
  ]);

  protected readonly openChipLabel = computed(() => {
    if (!this.store.acceptingOrders()) return 'Cerrado — el menú público no acepta pedidos';
    const season = this.store.settings().season;
    return 'Abierto · ' + (season === 'alta' ? 'Temporada alta' : 'Temporada baja');
  });

  ngOnInit(): void {
    void this.store.init();
    // Onboarding: la primera vez que un admin entra, se lanza el tour guiado.
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(TOUR_SEEN_KEY)) {
      setTimeout(() => this.startTour(), 600);
    }
  }

  /** Tour guiado (driver.js) que explica cada sección del panel. */
  protected startTour(): void {
    if (typeof document === 'undefined') return;
    const steps = this.navItems()
      .filter((item) => document.querySelector(`[data-tour="${item.path}"]`))
      .map((item) => ({
        element: `[data-tour="${item.path}"]`,
        popover: { title: item.label, description: item.tour },
      }));
    if (!steps.length) return;
    const tour = driver({
      showProgress: true,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Atrás',
      doneBtnText: 'Entendido',
      steps: [
        {
          popover: {
            title: '¡Bienvenido a tu panel!',
            description:
              'Te muestro en 30 segundos para qué sirve cada sección. Podrás repetir esta guía cuando quieras con “Ver guía del panel”.',
          },
        },
        ...steps,
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
