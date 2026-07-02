/**
 * Layout del panel de administración: sidebar cacao con navegación (badge de
 * pedidos activos), tarjeta de usuario abajo y chip de estado
 * abierto/temporada arriba a la derecha — calcado del diseño.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RestaurantStore } from '../../core/application/restaurant.store';
import { AuthService } from '../../core/auth/auth.service';
import { StaffTopbarComponent } from '../../shared/staff-topbar/staff-topbar.component';
import { initialsOf } from '../../shared/ui-maps';

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
    { path: 'plano', label: 'Plano del salón', badge: 0 },
    { path: 'pedidos', label: 'Pedidos', badge: this.store.activeOrders().length },
    { path: 'menu', label: 'Menú y productos', badge: 0 },
    { path: 'categorias', label: 'Categorías', badge: 0 },
    { path: 'meseros', label: 'Meseros y turnos', badge: 0 },
    { path: 'temporada', label: 'Temporada y horario', badge: 0 },
    { path: 'ajustes', label: 'Ajustes', badge: 0 },
  ]);

  protected readonly openChipLabel = computed(() => {
    if (!this.store.acceptingOrders()) return 'Cerrado — el menú público no acepta pedidos';
    const season = this.store.settings().season;
    return 'Abierto · ' + (season === 'alta' ? 'Temporada alta' : 'Temporada baja');
  });

  ngOnInit(): void {
    void this.store.init();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
