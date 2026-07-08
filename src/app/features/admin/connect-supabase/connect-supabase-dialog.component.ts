/**
 * Diálogo "Salir del modo demo".
 *
 * Pide al usuario la URL y la clave publishable de SU proyecto Supabase. Las
 * guarda en localStorage (runtime-config) y recarga: al arrancar, la app deja
 * el mock y trabaja contra su base — que estará **vacía desde cero**, así que
 * verá el registro inicial del administrador.
 */
import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { saveSupabaseConfig } from '../../../core/data/supabase/runtime-config';

@Component({
  selector: 'app-connect-supabase-dialog',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-cacao/60 px-4"
      role="dialog"
      aria-modal="true"
      (click)="onBackdrop($event)"
    >
      <div class="w-full max-w-[440px] rounded-2xl border border-borde bg-papel p-6 shadow-[0_24px_60px_rgba(36,26,17,.35)]">
        <h2 class="m-0 font-serif text-[21px] font-semibold text-tinta">{{ 'connect.title' | translate }}</h2>
        <p class="mt-1 mb-4 text-[12.5px] leading-relaxed text-tinta-media">{{ 'connect.subtitle' | translate }}</p>

        <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="sb-url">
          {{ 'connect.url_label' | translate }}
        </label>
        <input
          id="sb-url"
          [(ngModel)]="url"
          type="url"
          placeholder="https://xxxx.supabase.co"
          class="mb-3 min-h-11 w-full rounded-[9px] border-[1.5px] border-borde bg-crema px-3 py-2 text-[13px] text-tinta outline-none focus:border-terracota"
        />

        <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="sb-key">
          {{ 'connect.key_label' | translate }}
        </label>
        <input
          id="sb-key"
          [(ngModel)]="key"
          type="text"
          placeholder="sb_publishable_..."
          class="mb-3 min-h-11 w-full rounded-[9px] border-[1.5px] border-borde bg-crema px-3 py-2 font-mono text-[12px] text-tinta outline-none focus:border-terracota"
        />

        @if (errorKey()) {
          <div class="mb-3 rounded-[9px] border border-rojizo-borde bg-rojizo-bg px-3 py-2 text-[12px] font-semibold text-rojizo" role="alert">
            {{ errorKey()! | translate }}
          </div>
        }

        <div class="rounded-[10px] border-[1.5px] border-dashed border-borde-punteado p-3 text-[11px] leading-relaxed text-tinta-media">
          {{ 'connect.hint' | translate }}
        </div>

        <div class="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            (click)="close.emit()"
            class="cursor-pointer rounded-[10px] border border-borde bg-transparent px-4 py-2.5 text-[13px] font-semibold text-tinta-suave hover:bg-crema"
          >
            {{ 'connect.cancel' | translate }}
          </button>
          <button
            type="button"
            (click)="connect()"
            class="cursor-pointer rounded-[10px] border-none bg-terracota px-4 py-2.5 text-[13px] font-bold text-lino-calido hover:bg-terracota-hover"
          >
            {{ 'connect.submit' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConnectSupabaseDialogComponent {
  readonly close = output<void>();

  protected url = '';
  protected key = '';
  protected readonly errorKey = signal<string | null>(null);

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }

  protected connect(): void {
    const url = this.url.trim();
    const key = this.key.trim();
    // Validación mínima: una URL de Supabase y una clave con pinta de publishable/anon.
    if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url) || key.length < 20) {
      this.errorKey.set('connect.error_invalid');
      return;
    }
    saveSupabaseConfig(url, key);
    // Recargar para rearrancar la app contra el proyecto del usuario.
    window.location.reload();
  }
}
