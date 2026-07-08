import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { PasswordFieldComponent } from '../../shared/password-field/password-field.component';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, RouterLink, TranslatePipe, PasswordFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col bg-crema">
      <div class="mx-auto w-full max-w-[480px] px-5 py-8">
        <a routerLink="/" class="text-[12.5px] font-semibold text-terracota-profundo hover:underline">
          ← {{ 'profile.back' | translate }}
        </a>

        <h1 class="mt-4 mb-1 font-serif text-[27px] font-semibold text-tinta">{{ 'profile.title' | translate }}</h1>
        <p class="mt-0 mb-6 text-[13px] text-tinta-media">{{ 'profile.subtitle' | translate }}</p>

        @if (auth.user(); as user) {
          <div class="mb-5 rounded-[14px] border border-borde bg-papel px-5 py-4">
            <div class="text-[11px] font-semibold text-tinta-media">{{ 'profile.name' | translate }}</div>
            <div class="text-[15px] font-semibold text-tinta">{{ user.fullName }}</div>
            <div class="mt-3 text-[11px] font-semibold text-tinta-media">{{ 'profile.email' | translate }}</div>
            <div class="text-[13px] text-tinta">{{ user.email }}</div>
          </div>
        }

        <form
          class="rounded-[14px] border border-borde bg-papel px-5 py-5"
          (ngSubmit)="submit()"
        >
          <h2 class="m-0 text-[15px] font-semibold text-tinta">{{ 'profile.change_password' | translate }}</h2>
          <p class="mt-1 mb-4 text-[12px] text-tinta-media">{{ 'profile.change_password_hint' | translate }}</p>

          <label class="mb-1 block text-[11px] font-semibold text-tinta-media" for="current-pwd">
            {{ 'profile.current_password' | translate }}
          </label>
          <app-password-field
            inputId="current-pwd"
            class="mb-3 block"
            [(value)]="currentPassword"
            autocomplete="current-password"
          />

          <label class="mb-1 block text-[11px] font-semibold text-tinta-media" for="new-pwd">
            {{ 'profile.new_password' | translate }}
          </label>
          <app-password-field
            inputId="new-pwd"
            class="mb-3 block"
            [(value)]="newPassword"
            autocomplete="new-password"
          />

          <label class="mb-1 block text-[11px] font-semibold text-tinta-media" for="confirm-pwd">
            {{ 'profile.confirm_password' | translate }}
          </label>
          <app-password-field
            inputId="confirm-pwd"
            class="mb-4 block"
            [(value)]="confirmPassword"
            autocomplete="new-password"
          />

          @if (error()) {
            <p class="mb-3 text-[12px] font-semibold text-rojizo" role="alert">{{ error() }}</p>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full cursor-pointer rounded-[10px] border-none bg-terracota py-[11px] text-[13.5px] font-bold text-lino-calido disabled:opacity-60"
          >
            {{ loading() ? ('profile.saving' | translate) : ('profile.save' | translate) }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class ProfileComponent {
  protected readonly auth = inject(AuthService);
  private toast = inject(ToastService);

  protected currentPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.error.set(null);
    if (this.newPassword.length < 8) {
      this.error.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.changePassword(this.currentPassword, this.newPassword);
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.toast.show('toast.password_updated');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      this.loading.set(false);
    }
  }
}
