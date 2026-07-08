import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { PasswordFieldComponent } from '../password-field/password-field.component';

@Component({
  selector: 'app-password-dialog',
  imports: [FormsModule, TranslatePipe, PasswordFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[70] flex items-center justify-center bg-cacao/55 p-4" role="dialog" aria-modal="true">
        <div class="w-full max-w-[440px] rounded-2xl border border-borde bg-papel p-5 shadow-[0_24px_60px_rgba(42,31,20,.25)]">
          <h2 class="m-0 font-serif text-[22px] font-semibold">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="mt-1 mb-0 text-[12px] text-tinta-media">{{ subtitle() }}</p>
          }

          @if (mode() === 'reveal') {
            <div class="mt-4 rounded-[10px] border border-borde bg-crema px-3.5 py-3">
              <div class="text-[11px] font-semibold text-tinta-media">{{ 'password_dialog.email' | translate }}</div>
              <div class="mt-0.5 font-mono text-[13px] text-tinta">{{ email() }}</div>
              <div class="mt-3 text-[11px] font-semibold text-tinta-media">{{ 'password_dialog.password' | translate }}</div>
              <div class="relative mt-0.5">
                <div class="break-all rounded-[9px] border border-borde bg-papel py-2 pr-10 pl-3 font-mono text-[15px] font-bold text-tinta">
                  {{ revealVisible() ? password() : '••••••••••••' }}
                </div>
                <button
                  type="button"
                  (click)="revealVisible.set(!revealVisible())"
                  [attr.aria-label]="(revealVisible() ? 'login.hide_password' : 'login.show_password') | translate"
                  [attr.aria-pressed]="revealVisible()"
                  class="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-tinta-suave hover:bg-crema hover:text-tinta"
                >
                  @if (revealVisible()) {
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
            </div>
            <p class="mt-3 text-[11px] text-tinta-media">{{ 'password_dialog.reveal_hint' | translate }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                (click)="copyPassword()"
                class="cursor-pointer rounded-[9px] border-none bg-tinta px-4 py-2.5 text-[12.5px] font-semibold text-lino"
              >
                {{ copied() ? ('password_dialog.copied' | translate) : ('password_dialog.copy' | translate) }}
              </button>
              <button
                type="button"
                (click)="closed.emit()"
                class="cursor-pointer rounded-[9px] border border-borde bg-papel px-4 py-2.5 text-[12.5px] font-semibold text-tinta"
              >
                {{ 'password_dialog.close' | translate }}
              </button>
            </div>
          } @else {
            <div class="mt-4 space-y-3">
              <div>
                <label class="mb-1 block text-[11px] font-semibold text-tinta-media" for="pwd-new">
                  {{ 'password_dialog.new_password' | translate }}
                </label>
                <app-password-field
                  inputId="pwd-new"
                  [(value)]="draftNew"
                  autocomplete="new-password"
                />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold text-tinta-media" for="pwd-confirm">
                  {{ 'password_dialog.confirm_password' | translate }}
                </label>
                <app-password-field
                  inputId="pwd-confirm"
                  [(value)]="draftConfirm"
                  autocomplete="new-password"
                />
              </div>
              @if (error()) {
                <p class="m-0 text-[11.5px] font-semibold text-rojizo" role="alert">{{ error() }}</p>
              }
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                (click)="submitSet()"
                [disabled]="saving()"
                class="cursor-pointer rounded-[9px] border-none bg-terracota px-4 py-2.5 text-[12.5px] font-semibold text-lino-calido disabled:opacity-60"
              >
                {{ saving() ? ('password_dialog.saving' | translate) : ('password_dialog.save' | translate) }}
              </button>
              <button
                type="button"
                (click)="closed.emit()"
                class="cursor-pointer rounded-[9px] border border-borde bg-papel px-4 py-2.5 text-[12.5px] font-semibold text-tinta"
              >
                {{ 'password_dialog.cancel' | translate }}
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class PasswordDialogComponent {
  readonly open = input(false);
  readonly mode = input<'reveal' | 'set'>('set');
  readonly title = input('Contraseña');
  readonly subtitle = input('');
  readonly email = input('');
  readonly password = input('');

  readonly saved = output<string>();
  readonly closed = output<void>();

  protected draftNew = '';
  protected draftConfirm = '';
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly copied = signal(false);
  protected readonly revealVisible = signal(false);

  protected async copyPassword(): Promise<void> {
    const value = this.password();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }

  protected submitSet(): void {
    this.error.set(null);
    const next = this.draftNew.trim();
    const confirm = this.draftConfirm.trim();
    if (next.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (next !== confirm) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.saving.set(true);
    this.saved.emit(next);
    this.saving.set(false);
    this.draftNew = '';
    this.draftConfirm = '';
  }
}
