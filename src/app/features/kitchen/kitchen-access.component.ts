import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import {
  KITCHEN_PIN_LENGTH,
  canonicalKitchenAccessPath,
  isKitchenPinValid,
  resolveKitchenLinks,
} from '../../core/auth/kitchen-auth';
import { resolveKitchenRestaurant } from '../../core/auth/kitchen.guard';
import { RestaurantContextService } from '../../core/application/restaurant-context.service';
import { RestaurantRepository } from '../../core/domain/repositories/repositories';
import { isDemoMode } from '../../core/data/supabase/runtime-config';

@Component({
  selector: 'app-kitchen-access',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center bg-cacao px-5 py-8">
      <div class="w-full max-w-[360px] rounded-2xl border border-lino-calido/10 bg-cacao px-6 py-8 text-center shadow-lg">
        <div class="mb-1 font-serif text-[26px] font-semibold text-lino-calido">
          {{ 'kitchen.access_title' | translate }}
        </div>
        @if (restaurantName()) {
          <p class="mt-1 mb-6 text-[13px] text-lino-gris">{{ restaurantName() }}</p>
        }

        <div
          class="mb-6 flex justify-center gap-2.5"
          role="status"
          [attr.aria-label]="'kitchen.pin_label' | translate"
        >
          @for (i of pinSlots; track i) {
            <span
              class="h-3 w-3 rounded-full border border-lino-calido/30 transition-colors"
              [class.bg-arcilla]="pin().length > i"
              [class.border-arcilla]="pin().length > i"
            ></span>
          }
        </div>

        @if (error()) {
          <p class="mb-4 text-[12px] font-semibold text-rojizo-claro" role="alert">{{ error() }}</p>
        }

        <div class="mx-auto grid max-w-[240px] grid-cols-3 gap-2.5">
          @for (digit of digits; track digit) {
            <button
              type="button"
              (click)="append(digit)"
              [disabled]="busy()"
              class="flex h-14 cursor-pointer items-center justify-center rounded-xl border border-lino-calido/15 bg-cacao/60 text-[22px] font-semibold text-lino-calido transition-colors hover:border-arcilla hover:bg-cacao disabled:opacity-50"
            >
              {{ digit }}
            </button>
          }
          <button
            type="button"
            (click)="clear()"
            [disabled]="busy() || pin().length === 0"
            class="flex h-14 cursor-pointer items-center justify-center rounded-xl border border-lino-calido/15 text-[13px] font-semibold text-lino-gris hover:border-arcilla disabled:opacity-40"
          >
            {{ 'kitchen.pin_clear' | translate }}
          </button>
          <button
            type="button"
            (click)="append('0')"
            [disabled]="busy()"
            class="flex h-14 cursor-pointer items-center justify-center rounded-xl border border-lino-calido/15 bg-cacao/60 text-[22px] font-semibold text-lino-calido hover:border-arcilla disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            (click)="backspace()"
            [disabled]="busy() || pin().length === 0"
            aria-label="Borrar"
            class="flex h-14 cursor-pointer items-center justify-center rounded-xl border border-lino-calido/15 text-[20px] font-semibold text-lino-gris hover:border-arcilla disabled:opacity-40"
          >
            ⌫
          </button>
        </div>

        @if (demoHint()) {
          <p class="mt-6 text-[11px] text-lino-gris">{{ 'kitchen.access_demo_hint' | translate }}</p>
        }
      </div>
    </div>
  `,
})
export class KitchenAccessComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private context = inject(RestaurantContextService);
  private restaurantRepo = inject(RestaurantRepository);

  protected readonly pin = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly restaurantName = signal('');
  protected readonly demoHint = signal(isDemoMode());
  protected readonly pinSlots = Array.from({ length: KITCHEN_PIN_LENGTH }, (_, i) => i);
  protected readonly digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

  private restaurantId = signal<string | null>(null);
  private kitchenTarget = signal('/cocina');

  async ngOnInit(): Promise<void> {
    const restaurant = await resolveKitchenRestaurant(
      this.route.snapshot,
      this.restaurantRepo,
      this.context,
    );
    if (!restaurant) {
      this.error.set('No se encontró el restaurante');
      return;
    }
    this.restaurantId.set(restaurant.id);
    this.restaurantName.set(restaurant.name);
    const links = await resolveKitchenLinks(this.restaurantRepo, restaurant);
    this.kitchenTarget.set(links.kitchen);
    const canonical = canonicalKitchenAccessPath(this.router.url.split('?')[0], links);
    if (canonical) {
      await this.router.navigateByUrl(canonical, { replaceUrl: true });
    }
  }

  protected append(digit: string): void {
    if (this.busy() || this.pin().length >= KITCHEN_PIN_LENGTH) return;
    this.error.set('');
    const next = this.pin() + digit;
    this.pin.set(next);
    if (next.length === KITCHEN_PIN_LENGTH) {
      void this.tryUnlock(next);
    }
  }

  protected backspace(): void {
    if (this.busy()) return;
    this.pin.update((p) => p.slice(0, -1));
    this.error.set('');
  }

  protected clear(): void {
    if (this.busy()) return;
    this.pin.set('');
    this.error.set('');
  }

  private async tryUnlock(pin: string): Promise<void> {
    const rId = this.restaurantId();
    if (!rId || !isKitchenPinValid(pin)) return;
    this.busy.set(true);
    try {
      await this.auth.signInKitchen(rId, pin);
      await this.router.navigateByUrl(this.kitchenTarget());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'PIN incorrecto';
      this.error.set(msg);
      this.pin.set('');
    } finally {
      this.busy.set(false);
    }
  }
}
