/**
 * Menú y productos: grid de tarjetas con foto, precio, categoría, overlay
 * AGOTADO y switch de disponibilidad; formulario inline de alta y filtros por
 * categoría — todo según el diseño. Lo que se activa aquí aparece al instante
 * en el menú público del cliente.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { ImageCropperModalComponent, type CropSelection } from '../../../shared/image-cropper-modal.component';
import { cropImageSquare } from '../../../shared/image-utils';
import { MoneyPipe } from '../../../shared/money.pipe';
import { ChipBtnDirective } from '../../../shared/chip-btn.directive';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-menu-products',
  imports: [MoneyPipe, FormsModule, ImageCropperModalComponent, ChipBtnDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div data-testid="admin-menu">
      <div class="mb-[18px] flex items-end gap-4">
        <div class="flex-1">
          <h1 class="m-0 font-serif text-[27px] font-semibold">Menú y productos</h1>
          <p class="mt-1 mb-0 text-[13px] text-tinta-media">
            Lo que actives aquí aparece al instante en el menú público del cliente.
          </p>
        </div>
        <button
          type="button"
          (click)="showForm.set(!showForm())"
          class="cursor-pointer rounded-[10px] border-none bg-terracota px-[18px] py-2.5 text-[13px] font-semibold text-lino-calido hover:bg-terracota-hover"
        >
          + Nuevo producto
        </button>
      </div>

      @if (showForm()) {
        <div class="mb-[18px] flex flex-wrap items-center gap-3 rounded-[14px] border border-borde bg-papel px-[18px] py-4">
          <input
            [(ngModel)]="draftName"
            placeholder="Nombre del producto"
            aria-label="Nombre del producto"
            class="min-w-[180px] flex-2 rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
          />
          <input
            [(ngModel)]="draftPrice"
            placeholder="Precio"
            aria-label="Precio"
            class="w-[100px] rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
          />
          <div class="flex gap-[5px]">
            @for (cat of store.categories(); track cat.id) {
              <button chipBtn [active]="draftCategoryId() === cat.id" type="button"
                (click)="draftCategoryId.set(cat.id)" class="px-3 py-2 text-[11.5px]">
                {{ cat.name }}
              </button>
            }
          </div>
          <button
            type="button"
            (click)="save()"
            class="cursor-pointer rounded-[9px] border-none bg-tinta px-4 py-[9px] text-[12.5px] font-semibold text-lino"
          >
            Guardar
          </button>
        </div>
      }

      <!-- Filtros -->
      <div class="mb-4 flex flex-wrap gap-1.5">
        @for (chip of filterChips(); track chip.id) {
          <button chipBtn [active]="filterId() === chip.id" type="button"
            (click)="filterId.set(chip.id)" class="px-[15px] py-2 text-xs">
            {{ chip.name }}
          </button>
        }
      </div>

      <!-- Grid de productos -->
      <div class="grid grid-cols-[repeat(auto-fill,minmax(225px,1fr))] gap-3.5">
        @for (product of visibleProducts(); track product.id) {
          <article class="overflow-hidden rounded-[14px] border border-borde bg-papel">
            <div class="relative h-[110px]">
              @if (product.imageUrl) {
                <img
                  [src]="product.imageUrl"
                  [alt]="'Foto de ' + product.name"
                  class="h-full w-full object-cover"
                />
              } @else {
                <div class="flex h-full w-full items-center justify-center bg-panal font-mono text-[10px] text-tinta-media">
                  foto · {{ product.name.toLowerCase() }}
                </div>
              }
              @if (!product.available) {
                <div class="pointer-events-none absolute inset-0 flex items-center justify-center bg-crema/70">
                  <span
                    class="rounded-full border-[1.5px] border-lino-apagado px-2.5 py-[3px] text-[11px] font-bold tracking-[.08em] text-tinta-media"
                  >
                    AGOTADO
                  </span>
                </div>
              }
              <!-- Subir/cambiar foto: label accesible que dispara un input file oculto -->
              <label
                class="absolute right-2 bottom-2 cursor-pointer rounded-full bg-cacao/85 px-2.5 py-1 text-[10.5px] font-bold text-lino hover:bg-cacao"
              >
                {{ product.imageUrl ? 'Cambiar foto' : 'Subir foto' }}
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  [attr.aria-label]="'Subir foto de ' + product.name"
                  (change)="onProductImage(product.id, $event)"
                />
              </label>
            </div>
            <div class="px-3.5 pt-3 pb-3.5">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-sm font-semibold">{{ product.name }}</span>
                <span class="text-sm font-bold">{{ product.price | money }}</span>
              </div>
              <div class="mt-1 mb-3 text-[11.5px] leading-snug text-tinta-media">{{ product.description }}</div>
              <div class="flex items-center justify-between">
                <span class="rounded-full bg-crema px-[9px] py-[3px] text-[10.5px] font-semibold text-tinta-suave">
                  {{ product.categoryName }}
                </span>
                <button
                  type="button"
                  role="switch"
                  [attr.aria-checked]="product.available"
                  [attr.aria-label]="'Disponibilidad de ' + product.name"
                  (click)="store.toggleProductAvailability(product.id)"
                  class="relative h-5 w-9 cursor-pointer rounded-full border-none p-0"
                  [style.background]="product.available ? '#7C905F' : '#D8CCBC'"
                >
                  <span
                    class="absolute top-0.5 h-4 w-4 rounded-full bg-papel transition-[left] duration-150"
                    [style.left.px]="product.available ? 18 : 2"
                  ></span>
                </button>
              </div>
            </div>
          </article>
        }
      </div>

      <app-image-cropper-modal
        [open]="cropOpen()"
        [imageUrl]="cropImageUrl()"
        title="Recortar foto del producto"
        (cancel)="cancelCrop()"
        (apply)="applyProductCrop($event)"
      />
    </div>
  `,
})
export class MenuProductsComponent {
  protected readonly store = inject(RestaurantStore);
  private toast = inject(ToastService);

  protected readonly showForm = signal(false);
  protected readonly filterId = signal<number | 'todas'>('todas');
  protected readonly cropOpen = signal(false);
  protected readonly cropImageUrl = signal<string | null>(null);
  protected draftName = '';
  protected draftPrice = '';
  protected readonly draftCategoryId = signal<number | null>(null);
  private pendingImageProductId: number | null = null;
  private pendingImageFile: File | null = null;

  protected readonly filterChips = computed(() => [
    { id: 'todas' as const, name: 'Todas' },
    ...this.store.categories().map((c) => ({ id: c.id, name: c.name })),
  ]);

  protected readonly visibleProducts = computed(() =>
    this.store.products().filter((p) => this.filterId() === 'todas' || p.categoryId === this.filterId()),
  );

  protected async save(): Promise<void> {
    const name = this.draftName.trim();
    if (!name) {
      this.toast.show('Ponle nombre al producto');
      return;
    }
    await this.store.addProduct({
      name,
      price: parseFloat(this.draftPrice) || 0,
      categoryId: this.draftCategoryId() ?? this.store.categories()[0]?.id ?? null,
    });
    this.draftName = '';
    this.draftPrice = '';
    this.showForm.set(false);
  }

  /** Sube la foto elegida y la asocia al producto. */
  protected onProductImage(id: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.pendingImageProductId = id;
      this.pendingImageFile = file;
      this.openCrop(file);
    }
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  protected cancelCrop(): void {
    this.closeCrop();
  }

  protected async applyProductCrop(selection: CropSelection): Promise<void> {
    if (!this.pendingImageFile || this.pendingImageProductId == null) {
      this.closeCrop();
      return;
    }

    const productId = this.pendingImageProductId;
    const originalFile = this.pendingImageFile;
    this.closeCrop();
    const cropped = await cropImageSquare(originalFile, { ...selection, outputSize: 900 });
    await this.store.setProductImageFromFile(productId, cropped);
  }

  private openCrop(file: File): void {
    this.releaseCropUrl();
    this.cropImageUrl.set(URL.createObjectURL(file));
    this.cropOpen.set(true);
  }

  private closeCrop(): void {
    this.cropOpen.set(false);
    this.releaseCropUrl();
    this.pendingImageFile = null;
    this.pendingImageProductId = null;
  }

  private releaseCropUrl(): void {
    const current = this.cropImageUrl();
    if (current) URL.revokeObjectURL(current);
    this.cropImageUrl.set(null);
  }
}
