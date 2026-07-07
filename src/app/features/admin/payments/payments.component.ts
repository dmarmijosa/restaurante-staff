/**
 * Métodos de pago (admin). Define con qué se puede cobrar (efectivo, tarjeta,
 * transferencia o cualquiera que el restaurante añada). El cajero solo ve los
 * métodos activos. Se pueden desactivar sin borrarlos (conserva el historial).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';

@Component({
  selector: 'app-payments',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[600px]" data-testid="admin-pagos">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">{{ 'admin.payments.title' | translate }}</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">{{ 'admin.payments.subtitle' | translate }}</p>
      </div>

      <form class="mb-4 flex gap-2.5" (submit)="add($event)">
        <input
          [(ngModel)]="draft"
          name="metodo"
            [placeholder]="'admin.payments.placeholder' | translate"
          class="min-h-11 flex-1 rounded-[10px] border-[1.5px] border-borde bg-papel px-3.5 py-2.5 text-[13px] text-tinta outline-none focus:border-terracota"
        />
        <button
          type="submit"
          class="cursor-pointer rounded-[10px] border-none bg-terracota px-[18px] py-2.5 text-[13px] font-semibold text-lino-calido hover:bg-terracota-hover"
        >
          {{ 'admin.payments.add' | translate }}
        </button>
      </form>

      <div class="overflow-hidden rounded-[14px] border border-borde bg-papel">
        @for (method of store.paymentMethods(); track method.id) {
          <div class="flex items-center gap-3 border-b border-panal px-[18px] py-[13px]">
            <span class="flex-1 text-sm font-semibold" [class.text-tinta-media]="!method.active">
              {{ method.name }}
            </span>
            <span
              class="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
              [class]="method.active ? 'bg-oliva-bg text-oliva-texto' : 'bg-panal text-tinta-media'"
            >
          {{ method.active ? ('admin.payments.active' | translate) : ('admin.payments.inactive' | translate) }}
            </span>
            <button
              type="button"
              role="switch"
              [attr.aria-checked]="method.active"
              [attr.aria-label]="'admin.payments.activate' | translate: { name: method.name }"
              (click)="store.togglePaymentMethod(method.id)"
              class="relative h-5 w-9 cursor-pointer rounded-full border-none p-0"
              [style.background]="method.active ? '#7C905F' : '#D8CCBC'"
            >
              <span
                class="absolute top-0.5 h-4 w-4 rounded-full bg-papel transition-[left] duration-150"
                [style.left.px]="method.active ? 18 : 2"
              ></span>
            </button>
            <button
              type="button"
              (click)="store.deletePaymentMethod(method.id)"
              class="cursor-pointer border-none bg-transparent text-xs font-semibold text-rojizo hover:underline"
            >
              {{ 'admin.payments.delete' | translate }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class PaymentsComponent {
  protected readonly store = inject(RestaurantStore);
  protected draft = '';

  protected async add(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.draft.trim()) return;
    if (await this.store.addPaymentMethod(this.draft)) this.draft = '';
  }
}
