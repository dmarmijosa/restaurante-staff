import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { isSupabaseConfigured } from '../../core/data/supabase/supabase-client.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center bg-crema px-6">
      <a routerLink="/" class="mb-8 flex items-center gap-2.5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-terracota font-serif text-lg font-bold text-lino-calido"
        >
          R
        </div>
        <div>
          <div class="font-serif text-xl leading-tight font-semibold text-tinta">Restaurante Staff</div>
          <div class="text-[11px] text-tinta-media">{{ 'topbar.platform' | translate }}</div>
        </div>
      </a>

      <!-- Formulario de acceso (demo y Supabase comparten el mismo form) -->
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="w-full max-w-[400px] rounded-2xl border border-borde bg-papel p-7"
        >
          <h1 class="m-0 font-serif text-[23px] font-semibold text-tinta" data-testid="login-heading">{{ 'login.title' | translate }}</h1>
          <p class="mt-1 mb-5 text-[13px] text-tinta-media">{{ 'login.subtitle' | translate }}</p>

          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="email">
            {{ 'login.email' | translate }} <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <input
            id="email"
            type="email"
            inputmode="email"
            formControlName="email"
            autocomplete="email"
            required
            placeholder="correo@restaurante.mx"
            (blur)="emailTouched.set(true)"
            [attr.aria-invalid]="emailInvalid()"
            [attr.aria-describedby]="emailInvalid() ? 'email-error' : null"
            class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
            [class.border-borde]="!emailInvalid()"
            [class.border-rojizo]="emailInvalid()"
          />
          @if (emailInvalid()) {
            <p id="email-error" class="mt-1.5 mb-2.5 text-[11.5px] font-semibold text-rojizo">
              {{ 'login.email_invalid' | translate }}
            </p>
          } @else {
            <div class="mb-4"></div>
          }

          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="password">
            {{ 'login.password' | translate }} <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              (blur)="passwordTouched.set(true)"
              [attr.aria-invalid]="passwordInvalid()"
              [attr.aria-describedby]="passwordInvalid() ? 'password-error' : null"
              class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel py-[9px] pr-16 pl-3 text-[13px] text-tinta outline-none focus:border-terracota"
              [class.border-borde]="!passwordInvalid()"
              [class.border-rojizo]="passwordInvalid()"
            />
            <button
              type="button"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="(showPassword() ? 'login.hide_password' : 'login.show_password') | translate"
              [attr.aria-pressed]="showPassword()"
              class="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[11px] font-bold text-terracota-profundo hover:bg-crema"
            >
              {{ (showPassword() ? 'login.hide_password' : 'login.show_password') | translate }}
            </button>
          </div>
          @if (passwordInvalid()) {
            <p id="password-error" class="mt-1.5 mb-3.5 text-[11.5px] font-semibold text-rojizo">
              {{ 'login.password_required' | translate }}
            </p>
          } @else {
            <div class="mb-5"></div>
          }

          @if (error()) {
            <div
              class="mb-4 rounded-[9px] border border-rojizo-borde bg-rojizo-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-rojizo"
              role="alert"
              aria-live="assertive"
            >
              {{ error()! | translate }}
            </div>
          }

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full cursor-pointer rounded-[10px] border-none bg-terracota py-[11px] text-[13.5px] font-bold text-lino-calido hover:bg-terracota-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ (loading() ? 'login.submitting' : 'login.submit') | translate }}
          </button>

          @if (demoMode) {
            <div class="mt-5 rounded-[10px] border-[1.5px] border-dashed border-borde-punteado p-3.5 text-[11.5px] leading-relaxed text-tinta-media">
              <strong>Modo demo</strong> — sin Supabase configurado. Cuentas de prueba:<br />
              admin&#64;demo.dev / admin123 &nbsp;·&nbsp; mesero&#64;demo.dev / mesero123 &nbsp;·&nbsp; cocina&#64;demo.dev / cocina123
            </div>
          }
        </form>

      <a routerLink="/" class="mt-6 text-[12.5px] font-semibold text-terracota-profundo hover:underline">
        {{ 'login.back_to_menu' | translate }}
      </a>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  ngOnInit(): void {}

  protected readonly demoMode = !isSupabaseConfigured();
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly demoAccounts = [
    { role: 'admin',  label: 'Administrador', initial: 'A',  email: 'admin@demo.dev',  password: 'admin123'  },
    { role: 'mesero', label: 'Mesero',         initial: 'M',  email: 'mesero@demo.dev', password: 'mesero123' },
    { role: 'cocina', label: 'Cocina',          initial: 'C',  email: 'cocina@demo.dev', password: 'cocina123' },
    { role: 'cajero', label: 'Cajero',          initial: 'Ca', email: 'cajero@demo.dev', password: 'cajero123' },
  ];

  protected readonly emailTouched = signal(false);
  protected readonly passwordTouched = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected emailInvalid(): boolean {
    return this.emailTouched() && this.form.controls.email.invalid;
  }

  protected passwordInvalid(): boolean {
    return this.passwordTouched() && this.form.controls.password.invalid;
  }

  /** Acceso rápido en modo demo. */
  protected async loginDemo(email: string, password: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const user = await this.auth.signIn(email, password);
      const homeByRole: Record<string, string> = {
        admin: '/admin', mesero: '/mesero', cocina: '/cocina', cajero: '/cajero',
      };
      await this.router.navigateByUrl(homeByRole[user.role] ?? '/');
    } catch {
      this.error.set('login.error_invalid');
    } finally {
      this.loading.set(false);
    }
  }

  /** Autentica y redirige al área del rol (o a la URL pedida originalmente). */
  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.emailTouched.set(true);
      this.passwordTouched.set(true);
      const firstInvalid = this.form.controls.email.invalid ? 'email' : 'password';
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const user = await this.auth.signIn(email, password);
      const redirect = this.route.snapshot.queryParamMap.get('redirect');
      const homeByRole: Record<string, string> = {
        admin: '/admin', mesero: '/mesero', cocina: '/cocina', cajero: '/cajero',
      };
      await this.router.navigateByUrl(redirect ?? homeByRole[user.role] ?? '/');
    } catch {
      this.error.set('login.error_invalid');
    } finally {
      this.loading.set(false);
    }
  }
}
