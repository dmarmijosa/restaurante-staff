/**
 * Tarjeta de comanda reutilizable.
 *
 * El mismo bloque HTML aparece en el kanban de admin, la tablet del mesero y
 * la vista del cajero; extraerlo aquí elimina la duplicación y garantiza que
 * cualquier cambio (formato de importe, estructura de items) se propague a las
 * tres vistas a la vez.
 *
 * Entradas:
 *   · order        — la comanda a mostrar
 *   · showStatus   — muestra el badge de estado (mesero/cajero)
 *   · showMeta     — muestra mesero y hora de creación (admin kanban)
 *   · actionLabel  — texto del botón de avance; si es null, no se muestra
 *   · actionFull   — botón ocupa el ancho completo (admin); false = inline (mesero)
 *   · disabled     — deshabilita el botón de acción (modo offline)
 *
 * Salida:
 *   · (advance)    — emitido al pulsar el botón de acción
 */
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MoneyPipe } from '../money.pipe';
import { ORDER_STATUS_UI } from '../ui-maps';
import { orderTotal, type Order } from '../../core/domain/entities/entities';

@Component({
  selector: 'app-order-card',
  imports: [MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="rounded-xl border border-borde bg-papel"
      [class]="actionFull() ? 'px-3.5 py-3' : 'px-4 py-3.5'">

      <!-- Cabecera: mesa + ID + (status badge | hora) -->
      <div [class]="showStatus() ? 'mb-[9px] flex items-center gap-2' : 'mb-2 flex items-baseline gap-2'">
        <span [class]="showStatus() ? 'text-sm font-bold' : 'text-[13.5px] font-bold'">
          {{ 'admin.orders.mesa' | translate }} {{ order().tableNumber }}
        </span>
        <span class="font-mono text-[11px] text-tinta-media">#{{ order().id }}</span>
        <span class="flex-1"></span>

        @if (showStatus()) {
          <span
            class="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
            [style.background]="statusUi[order().status].bg"
            [style.color]="statusUi[order().status].color"
          >
            {{ ('order.status.' + order().status) | translate }}
          </span>
        }
        @if (showMeta()) {
          <span class="text-[11px] text-tinta-media">{{ order().createdAt }}</span>
        }
      </div>

      <!-- Items -->
      <ul class="mb-2 flex list-none flex-col gap-1 p-0"
        [class]="showStatus() ? 'mb-2.5 text-[12.5px]' : 'text-xs'">
        @for (item of order().items; track item.productName) {
          <li class="flex gap-1.5 text-tinta-suave">
            <span class="font-semibold">{{ item.quantity }}×</span>
            <span class="flex-1">{{ item.productName }}</span>
            <span>{{ item.unitPrice * item.quantity | money }}</span>
          </li>
        }
      </ul>

      <!-- Pie: meta + total + acción -->
      @if (actionFull()) {
        <!-- Admin: mesero | total + botón ancho completo -->
        <div class="mb-2 flex justify-between border-t border-panal pt-2 text-[12.5px]">
          @if (showMeta()) {
            <span class="text-tinta-media">{{ order().waiterName }}</span>
          }
          <span class="font-bold">{{ total() | money }}</span>
        </div>
        @if (actionLabel()) {
          <button
            type="button"
            [disabled]="disabled()"
            (click)="advance.emit()"
            class="w-full cursor-pointer rounded-[9px] border-none bg-tinta py-2 text-xs font-semibold text-lino hover:bg-cacao-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ actionLabel() }}
          </button>
        }
      } @else {
        <!-- Mesero: total inline + botón a la derecha -->
        <div class="flex items-center gap-2.5">
          <span class="flex-1 text-[13px] font-bold">{{ total() | money }}</span>
          @if (actionLabel()) {
            <button
              type="button"
              [disabled]="disabled()"
              (click)="advance.emit()"
              class="cursor-pointer rounded-[9px] border-none bg-tinta px-3.5 py-2 text-xs font-semibold text-lino hover:bg-cacao-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ actionLabel() }}
            </button>
          }
        </div>
      }
    </article>
  `,
})
export class OrderCardComponent {
  order      = input.required<Order>();
  showStatus = input(false);
  showMeta   = input(false);
  actionLabel = input<string | null>(null);
  actionFull = input(false);
  disabled   = input(false);

  advance = output<void>();

  protected readonly statusUi = ORDER_STATUS_UI;
  protected total = () => orderTotal(this.order());
}
