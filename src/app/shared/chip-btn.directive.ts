/**
 * Directiva de botón-chip (pill) reutilizable.
 *
 * Aplicar a cualquier `<button chipBtn>` para manejar automáticamente los
 * colores activo/inactivo sin repetir la ternaria de clases en cada componente.
 * El padding, el tamaño de texto y otros estilos visuales se siguen pasando
 * desde el template para mantener flexibilidad:
 *
 *   <button chipBtn [active]="x" class="px-3.5 py-2 text-[12px]">Texto</button>
 *
 * Variantes:
 *   · 'tinta'     — activo: fondo cacao oscuro (bg-tinta, texto blanco)
 *   · 'terracota' — activo: fondo terracota (bg-terracota, texto crema)
 *   · 'outlined'  — activo + borde (border-terracota bg-terracota texto crema);
 *                   inactivo con borde visible (border-borde bg-papel)
 *   · 'cacao'     — activo: fondo cacao (bg-cacao, texto lino); usado en la
 *                   vista del cliente (menú QR con fondo arena)
 */
import { Directive, HostBinding, input } from '@angular/core';

@Directive({
  selector: 'button[chipBtn]',
  standalone: true,
})
export class ChipBtnDirective {
  /** Estado activo/inactivo del chip. */
  active = input.required<boolean>();
  /** Variante de color. Por defecto: 'tinta'. */
  variant = input<'tinta' | 'terracota' | 'outlined' | 'cacao'>('tinta');

  @HostBinding('class')
  get classes(): string {
    const v = this.variant();
    if (v === 'outlined') {
      const base = 'cursor-pointer rounded-full font-semibold transition-colors border';
      const state = this.active()
        ? 'border-terracota bg-terracota text-lino-calido'
        : 'border-borde bg-papel text-tinta-suave hover:border-terracota';
      return `${base} ${state}`;
    }
    const base = 'cursor-pointer rounded-full border-none font-semibold transition-colors';
    const state = this.active()
      ? v === 'terracota'
        ? 'bg-terracota text-lino-calido'
        : v === 'cacao'
          ? 'bg-cacao text-lino'
          : 'bg-tinta text-lino'
      : v === 'cacao'
        ? 'bg-arena text-tinta-suave'
        : 'bg-panal text-tinta-suave';
    return `${base} ${state}`;
  }
}
