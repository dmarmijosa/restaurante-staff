/**
 * Categorías del menú: alta rápida y listado con conteo de productos.
 * Regla del diseño: no puede eliminarse una categoría con productos dentro.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantStore } from '../../../core/application/restaurant.store';

@Component({
  selector: 'app-categories',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[600px]" data-testid="admin-categorias">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">Categorías</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">Organizan el menú público y los filtros del panel.</p>
      </div>
      <form class="mb-4 flex gap-2.5" (submit)="add($event)">
        <input
          [(ngModel)]="draft"
          name="categoria"
          placeholder="Nueva categoría, p. ej. Especiales"
          class="flex-1 rounded-[10px] border-[1.5px] border-borde bg-papel px-3.5 py-2.5 text-[13px] text-tinta outline-none focus:border-terracota"
        />
        <button
          type="submit"
          class="cursor-pointer rounded-[10px] border-none bg-terracota px-[18px] py-2.5 text-[13px] font-semibold text-lino-calido hover:bg-terracota-hover"
        >
          Agregar
        </button>
      </form>
      <div class="overflow-hidden rounded-[14px] border border-borde bg-papel">
        @for (row of rows(); track row.id) {
          <div class="flex items-center gap-3 border-b border-panal px-[18px] py-[13px]">
            <span class="flex-1 text-sm font-semibold">{{ row.name }}</span>
            <span class="text-xs text-tinta-media">
              {{ row.count }} {{ row.count === 1 ? 'producto' : 'productos' }}
            </span>
            <button
              type="button"
              (click)="store.deleteCategory(row.id)"
              class="cursor-pointer border-none bg-transparent text-xs font-semibold text-rojizo hover:underline"
            >
              Eliminar
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class CategoriesComponent {
  protected readonly store = inject(RestaurantStore);
  protected draft = '';

  protected readonly rows = computed(() =>
    this.store.categories().map((cat) => ({
      ...cat,
      count: this.store.products().filter((p) => p.categoryId === cat.id).length,
    })),
  );

  protected async add(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.draft.trim();
    if (!name) return;
    if (await this.store.addCategory(name)) this.draft = '';
  }
}
