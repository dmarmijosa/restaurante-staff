import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-password-field',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <input
        [id]="inputId()"
        [type]="visible() ? 'text' : 'password'"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder()"
        [autocomplete]="autocomplete()"
        [attr.aria-label]="ariaLabel() || placeholder()"
        class="w-full rounded-[9px] border-[1.5px] border-borde bg-papel py-[9px] pr-10 pl-3 text-[13px] text-tinta outline-none focus:border-terracota"
      />
      <button
        type="button"
        (click)="visible.set(!visible())"
        [attr.aria-label]="(visible() ? 'login.hide_password' : 'login.show_password') | translate"
        [attr.aria-pressed]="visible()"
        class="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-tinta-suave hover:bg-crema hover:text-tinta"
      >
        @if (visible()) {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M1 1l22 22" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          </svg>
        } @else {
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
      </button>
    </div>
  `,
})
export class PasswordFieldComponent {
  readonly value = model('');
  readonly inputId = input('password');
  readonly placeholder = input('');
  readonly autocomplete = input('new-password');
  readonly ariaLabel = input('');
  protected readonly visible = signal(false);
}
