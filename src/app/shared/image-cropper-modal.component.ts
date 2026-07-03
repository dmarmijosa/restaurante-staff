import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface CropSelection {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

@Component({
  selector: 'app-image-cropper-modal',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open() && imageUrl()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-cacao/55 p-4" role="dialog" aria-modal="true">
        <div class="w-full max-w-[520px] rounded-2xl border border-borde bg-papel p-5 shadow-[0_24px_60px_rgba(42,31,20,.25)]">
          <div class="mb-4">
            <h2 class="m-0 font-serif text-[24px] font-semibold">{{ title() }}</h2>
            <p class="mt-1 mb-0 text-[12px] text-tinta-media">
              Ajusta el encuadre para decidir exactamente que parte de la imagen se sube.
            </p>
          </div>

          <div class="mx-auto mb-4 h-[260px] w-[260px] overflow-hidden rounded-2xl border border-borde bg-panal">
            <img
              [src]="imageUrl()!"
              alt="Vista previa del recorte"
              class="h-full w-full object-cover"
              [style.transform]="previewTransform()"
            />
          </div>

          <div class="mb-3 grid grid-cols-1 gap-3 text-[12px] text-tinta-media sm:grid-cols-3">
            <label class="flex flex-col gap-1">
              <span class="font-semibold text-tinta-suave">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                [ngModel]="zoom()"
                (ngModelChange)="zoom.set($event)"
                aria-label="Zoom del recorte"
              />
            </label>

            <label class="flex flex-col gap-1">
              <span class="font-semibold text-tinta-suave">Horizontal</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                [ngModel]="offsetX()"
                (ngModelChange)="offsetX.set($event)"
                aria-label="Desplazamiento horizontal"
              />
            </label>

            <label class="flex flex-col gap-1">
              <span class="font-semibold text-tinta-suave">Vertical</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                [ngModel]="offsetY()"
                (ngModelChange)="offsetY.set($event)"
                aria-label="Desplazamiento vertical"
              />
            </label>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              (click)="onCancel()"
              class="cursor-pointer rounded-[10px] border border-borde bg-papel px-4 py-2 text-[12px] font-semibold text-tinta-suave hover:bg-crema"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="onApply()"
              class="cursor-pointer rounded-[10px] border-none bg-terracota px-4 py-2 text-[12px] font-semibold text-lino-calido hover:bg-terracota-hover"
            >
              Aplicar recorte
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ImageCropperModalComponent {
  readonly open = input(false);
  readonly imageUrl = input<string | null>(null);
  readonly title = input('Recortar imagen');

  readonly cancel = output<void>();
  readonly apply = output<CropSelection>();

  protected readonly zoom = signal(1);
  protected readonly offsetX = signal(0);
  protected readonly offsetY = signal(0);

  protected readonly previewTransform = () =>
    `translate(${this.offsetX()}%, ${this.offsetY()}%) scale(${this.zoom().toFixed(2)})`;

  private readonly resetOnOpen = effect(() => {
    if (this.open()) {
      this.zoom.set(1);
      this.offsetX.set(0);
      this.offsetY.set(0);
    }
  });

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onApply(): void {
    this.apply.emit({
      zoom: this.zoom(),
      offsetX: this.offsetX(),
      offsetY: this.offsetY(),
    });
  }
}
