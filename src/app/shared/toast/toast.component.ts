/**
 * Presentación del toast global con traducción automática (ngx-translate).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast.message(); as msg) {
      <div
        class="animate-toast-in fixed bottom-[26px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-cacao px-5 py-2.5 text-[13px] font-medium whitespace-nowrap text-lino shadow-[0_12px_30px_rgba(36,26,17,.4)]"
        role="status"
      >
        {{ msg.key | translate: (msg.params ?? {}) }}
      </div>
    }
  `,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
