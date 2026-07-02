/**
 * Plano del salón: lienzo punteado con mesas arrastrables, sillas calculadas
 * por geometría, selección (una para editar, dos para fusionar) y panel
 * lateral de edición — réplica funcional del diseño original.
 *
 * El drag usa Pointer Events como el mockup: si el puntero se mueve menos de
 * 5 px se interpreta como clic (selección); si no, arrastre con límites del
 * lienzo. Al soltar se persiste la posición.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { TABLE_STATUS_UI } from '../../../shared/ui-maps';
import { TableQrComponent } from '../../../shared/table-qr/table-qr.component';
import { chairsFor, clampPosition, tableDims } from './table-geometry';
import type { RestaurantTable, TableShape, TableStatus } from '../../../core/domain/entities/entities';

interface DragState {
  id: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  canvasW: number;
  canvasH: number;
}

@Component({
  selector: 'app-floor-plan',
  imports: [TableQrComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div data-testid="admin-plano">
      <div class="mb-4 flex items-end gap-4">
        <div class="flex-1">
          <h1 class="m-0 font-serif text-[27px] font-semibold">Plano del salón</h1>
          <p class="mt-1 mb-0 text-[13px] text-tinta-media">
            Arrastra las mesas para acomodar el salón. Haz clic para seleccionar; selecciona dos mesas para
            fusionarlas.
          </p>
        </div>
        @if (selectedIds().length === 2) {
          <button
            type="button"
            (click)="merge()"
            class="cursor-pointer rounded-[10px] border-[1.5px] border-tinta bg-transparent px-4 py-[9px] text-[13px] font-semibold text-tinta hover:bg-[#EAE1D2]"
          >
            Fusionar mesas
          </button>
        }
        @if (canSplit()) {
          <button
            type="button"
            (click)="split()"
            class="cursor-pointer rounded-[10px] border-[1.5px] border-tinta bg-transparent px-4 py-[9px] text-[13px] font-semibold text-tinta hover:bg-[#EAE1D2]"
          >
            Separar mesas
          </button>
        }
        <button
          type="button"
          (click)="store.addTable()"
          class="cursor-pointer rounded-[10px] border-none bg-terracota px-[18px] py-2.5 text-[13px] font-semibold text-lino-calido hover:bg-terracota-hover"
        >
          + Agregar mesa
        </button>
      </div>

      <div class="flex items-start gap-[18px]">
        <div class="min-w-0 flex-1">
          <!-- Leyenda -->
          <div class="mb-2.5 flex gap-4 text-[11.5px] text-tinta-media">
            @for (status of legendStatuses; track status) {
              <span class="flex items-center gap-1.5">
                <span class="h-[9px] w-[9px] rounded-[3px]" [style.background]="tableUi[status].border"></span>
                <span>{{ tableUi[status].label }}</span>
              </span>
            }
          </div>

          <!-- Lienzo -->
          <div class="overflow-x-auto rounded-2xl">
            <div
              #canvas
              class="plano-grid relative h-[560px] min-w-[780px] overflow-hidden rounded-2xl border border-borde bg-papel"
            >
              @for (view of tableViews(); track view.table.id) {
                <div
                  (pointerdown)="startDrag($event, view.table)"
                  class="absolute cursor-grab touch-none select-none"
                  [style.left.px]="view.table.x"
                  [style.top.px]="view.table.y"
                  [style.width.px]="view.dims.W"
                  [style.height.px]="view.dims.H"
                >
                  @for (chair of view.chairs; track $index) {
                    <div
                      class="absolute h-2.5 w-2.5 rounded-full bg-[#CDBBA2]"
                      [style.left.px]="chair.x"
                      [style.top.px]="chair.y"
                    ></div>
                  }
                  <div
                    class="absolute top-3.5 left-3.5 flex flex-col items-center justify-center gap-px border-[1.5px]"
                    [style.width.px]="view.dims.w"
                    [style.height.px]="view.dims.h"
                    [style.background]="tableUi[view.table.status].bg"
                    [style.border-color]="tableUi[view.table.status].border"
                    [style.border-radius]="view.dims.radius"
                    [style.box-shadow]="
                      view.selected ? '0 0 0 3px rgba(193,104,60,.45)' : '0 1px 2px rgba(44,33,24,.07)'
                    "
                  >
                    <div class="font-serif text-[17px] font-bold">{{ view.name }}</div>
                    <div class="text-[10px] text-tinta-media">{{ view.table.seats }} sillas</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Panel lateral -->
        <aside class="flex w-[278px] flex-none flex-col gap-3.5">
          @if (selectedTable(); as table) {
            <div class="rounded-[14px] border border-borde bg-papel p-[18px]">
              <div class="font-serif text-[19px] font-semibold">
                {{ table.mergedNumbers?.length ? 'Mesas ' + table.mergedNumbers!.join(' + ') : 'Mesa ' + table.number }}
              </div>
              <div class="mt-0.5 mb-4 text-xs text-tinta-media">
                {{
                  table.mergedNumbers?.length
                    ? 'Mesa fusionada · ' + table.seats + ' sillas'
                    : tableUi[table.status].label + ' · ' + table.seats + ' sillas'
                }}
              </div>

              <div class="mb-1.5 text-[11.5px] font-semibold text-tinta-media">SILLAS</div>
              <div class="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  (click)="store.changeSeats(table.id, -1)"
                  class="h-[30px] w-[30px] cursor-pointer rounded-[9px] border-[1.5px] border-borde bg-papel text-base text-tinta hover:bg-crema"
                  aria-label="Quitar silla"
                >
                  −
                </button>
                <div class="min-w-6 text-center text-[17px] font-bold">{{ table.seats }}</div>
                <button
                  type="button"
                  (click)="store.changeSeats(table.id, 1)"
                  class="h-[30px] w-[30px] cursor-pointer rounded-[9px] border-[1.5px] border-borde bg-papel text-base text-tinta hover:bg-crema"
                  aria-label="Agregar silla"
                >
                  +
                </button>
              </div>

              <div class="mb-1.5 text-[11.5px] font-semibold text-tinta-media">FORMA</div>
              <div class="mb-4 flex gap-1.5">
                @for (shape of shapes; track shape.key) {
                  <button
                    type="button"
                    (click)="store.setShape(table.id, shape.key)"
                    class="flex-1 cursor-pointer rounded-[9px] border-none py-2 text-xs font-semibold"
                    [class]="table.shape === shape.key ? 'bg-terracota text-lino-calido' : 'bg-crema text-tinta'"
                  >
                    {{ shape.label }}
                  </button>
                }
              </div>

              <div class="mb-1.5 text-[11.5px] font-semibold text-tinta-media">ESTADO</div>
              <div class="mb-[18px] flex gap-1.5">
                @for (status of legendStatuses; track status) {
                  <button
                    type="button"
                    (click)="store.setTableStatus(table.id, status)"
                    class="flex-1 cursor-pointer rounded-[9px] border-none py-2 text-[11.5px] font-semibold"
                    [class]="table.status === status ? 'bg-tinta text-lino' : 'bg-crema text-tinta'"
                  >
                    {{ tableUi[status].label }}
                  </button>
                }
              </div>

              <button
                type="button"
                (click)="removeSelected()"
                class="w-full cursor-pointer border-none bg-transparent p-1.5 text-[12.5px] font-semibold text-rojizo hover:underline"
              >
                Eliminar mesa
              </button>
            </div>

            <div class="rounded-[14px] border-[1.5px] border-dashed border-borde-punteado px-4 py-3.5">
              <app-table-qr [numero]="table.number" />
            </div>
          } @else {
            <div class="rounded-[14px] border border-borde bg-papel p-[18px]">
              <div class="mb-3.5 text-[13px] font-semibold">Resumen del salón</div>
              <div class="flex flex-col gap-2.5 text-[13px]">
                <div class="flex justify-between">
                  <span class="text-tinta-media">Mesas</span>
                  <span class="font-bold">{{ store.tables().length }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-tinta-media">Sillas totales</span>
                  <span class="font-bold">{{ totalSeats() }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-tinta-media">Ocupación</span>
                  <span class="font-bold">{{ occupancy() }}</span>
                </div>
              </div>
            </div>
            <div
              class="rounded-[14px] border-[1.5px] border-dashed border-borde-punteado px-4 py-3.5 text-[11.5px] leading-relaxed text-tinta-media"
            >
              Haz clic en una mesa para editar sillas, forma y estado. Selecciona dos mesas y presiona
              “Fusionar mesas” para unirlas.
            </div>
          }
        </aside>
      </div>
    </div>
  `,
})
export class FloorPlanComponent {
  protected readonly store = inject(RestaurantStore);

  private canvasRef = viewChild<ElementRef<HTMLDivElement>>('canvas');

  protected readonly tableUi = TABLE_STATUS_UI;
  protected readonly legendStatuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];
  protected readonly shapes: Array<{ key: TableShape; label: string }> = [
    { key: 'sq', label: 'Cuadrada' },
    { key: 'rd', label: 'Redonda' },
  ];

  /** Hasta 2 mesas seleccionadas (la más reciente manda en el panel). */
  protected readonly selectedIds = signal<number[]>([]);

  protected readonly selectedTable = computed<RestaurantTable | null>(() => {
    const ids = this.selectedIds();
    const lastId = ids[ids.length - 1];
    return this.store.tables().find((t) => t.id === lastId) ?? null;
  });

  protected readonly canSplit = computed(() => {
    const table = this.selectedTable();
    return this.selectedIds().length === 1 && Boolean(table?.backup);
  });

  protected readonly tableViews = computed(() => {
    const selected = this.selectedIds();
    return this.store.tables().map((table) => {
      const dims = tableDims(table);
      return {
        table,
        dims,
        chairs: chairsFor(table, dims),
        selected: selected.includes(table.id),
        name: table.mergedNumbers?.length ? table.mergedNumbers.join('+') : String(table.number),
      };
    });
  });

  protected readonly totalSeats = computed(() => this.store.tables().reduce((acc, t) => acc + t.seats, 0));

  protected readonly occupancy = computed(() => {
    const tables = this.store.tables();
    if (!tables.length) return '0%';
    const occupied = tables.filter((t) => t.status === 'ocupada').length;
    return Math.round((occupied / tables.length) * 100) + '%';
  });

  private drag: DragState | null = null;
  private onMove = (e: PointerEvent) => this.dragMove(e);
  private onUp = () => this.dragEnd();

  /** Inicia un posible drag; si no hay movimiento real se tratará como clic. */
  protected startDrag(event: PointerEvent, table: RestaurantTable): void {
    event.preventDefault();
    const canvas = this.canvasRef()?.nativeElement;
    const rect = canvas?.getBoundingClientRect() ?? { width: 920, height: 560 };
    this.drag = {
      id: table.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: table.x,
      originY: table.y,
      moved: false,
      canvasW: rect.width,
      canvasH: rect.height,
    };
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
  }

  private dragMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    const table = this.store.tables().find((t) => t.id === drag.id);
    if (!table) return;
    const dims = tableDims(table);
    const pos = clampPosition(drag.originX + dx, drag.originY + dy, dims, {
      width: drag.canvasW,
      height: drag.canvasH,
    });
    // Actualización visual inmediata; la persistencia ocurre al soltar.
    this.store.tables.update((ts) => ts.map((t) => (t.id === drag.id ? { ...t, x: pos.x, y: pos.y } : t)));
  }

  private dragEnd(): void {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    if (!drag.moved) {
      this.toggleSelect(drag.id);
      return;
    }
    const table = this.store.tables().find((t) => t.id === drag.id);
    if (table) void this.store.moveTable(table.id, table.x, table.y);
  }

  /** Selección tipo diseño: máximo dos mesas, repetir clic deselecciona. */
  private toggleSelect(id: number): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-2),
    );
  }

  protected async merge(): Promise<void> {
    const [aId, bId] = this.selectedIds();
    const merged = await this.store.mergeTables(aId, bId);
    this.selectedIds.set(merged ? [merged.id] : []);
  }

  protected async split(): Promise<void> {
    const table = this.selectedTable();
    if (!table) return;
    await this.store.splitTable(table.id);
    this.selectedIds.set([]);
  }

  protected async removeSelected(): Promise<void> {
    const table = this.selectedTable();
    if (!table) return;
    await this.store.removeTable(table.id);
    this.selectedIds.set([]);
  }
}
