/**
 * Código QR de una mesa. Genera localmente (sin llamadas externas, por
 * privacidad) un QR que apunta a `/mesa/:numero`; al escanearlo, el cliente
 * abre el menú con su mesa ya asignada. Reemplaza el placeholder "QR" del
 * diseño original con el código real e imprimible.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'app-table-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3">
      <img
        #img
        width="72"
        height="72"
        class="h-[72px] w-[72px] flex-none rounded-lg border border-borde bg-white p-1"
        [alt]="'Código QR de la mesa ' + numero()"
      />
      <div class="min-w-0 flex-1">
        <div class="text-[11.5px] leading-normal text-tinta-media">
          Escanéalo para abrir el menú con la <strong>mesa {{ numero() }}</strong> ya asignada.
        </div>
        <button
          type="button"
          (click)="print()"
          class="mt-1.5 cursor-pointer rounded-md border-[1.5px] border-borde bg-papel px-2.5 py-1 text-[11px] font-bold text-tinta-suave hover:bg-crema"
        >
          Imprimir QR
        </button>
      </div>
    </div>
  `,
})
export class TableQrComponent {
  private document = inject(DOCUMENT);

  /** Número de mesa que se codifica en la URL del QR. */
  readonly numero = input.required<number>();

  private img = viewChild.required<ElementRef<HTMLImageElement>>('img');

  /** URL absoluta que abre el menú del cliente en esta mesa. */
  protected readonly url = computed(() => {
    const origin = this.document.location?.origin ?? '';
    return `${origin}/mesa/${this.numero()}`;
  });

  private readonly dataUrl = computed(() => this.url());

  constructor() {
    // Regenera el QR cada vez que cambia la mesa seleccionada.
    effect(() => {
      const url = this.dataUrl();
      void toDataURL(url, { margin: 1, width: 144, color: { dark: '#241A11', light: '#FFFFFF' } })
        .then((src) => {
          const el = this.img().nativeElement;
          el.src = src;
        })
        .catch(() => {
          /* si falla la generación, se mantiene el alt como fallback accesible */
        });
    });
  }

  /** Abre el diálogo de impresión con solo el QR y la etiqueta de la mesa. */
  protected print(): void {
    const win = this.document.defaultView?.open('', '_blank', 'width=420,height=520');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR mesa ${this.numero()}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:40px;color:#2C2118}
      h1{font-size:22px;margin:0 0 6px}p{color:#8B7A69;margin:0 0 18px}img{width:260px;height:260px}</style>
      </head><body>
      <h1>Mesa ${this.numero()}</h1>
      <p>Escanea para ver el menú y pedir</p>
      <img src="${this.img().nativeElement.src}" alt="QR mesa ${this.numero()}" />
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`);
    win.document.close();
  }
}
