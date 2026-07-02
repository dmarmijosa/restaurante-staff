/**
 * Registro inicial del administrador propietario (una sola vez).
 *
 * Solo es accesible mientras no exista ningún admin (ver bootstrapGuard). El
 * primer usuario registrado se convierte en admin propietario por el trigger
 * `handle_new_user`. Tras crear la cuenta, si el proyecto exige confirmación
 * por correo se informa al usuario; si no, entra directo al panel.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register-admin',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center bg-crema px-6 py-10">
      <div class="mb-8 flex items-center gap-2.5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-terracota font-serif text-lg font-bold text-lino-calido"
        >
          R
        </div>
        <div>
          <div class="font-serif text-xl leading-tight font-semibold text-tinta">Restaurante Staff</div>
          <div class="text-[11px] text-tinta-media">Plataforma open source para restaurantes</div>
        </div>
      </div>

      @if (done()) {
        <div class="w-full max-w-[420px] rounded-2xl border border-borde bg-papel p-7 text-center">
          <h1 class="m-0 font-serif text-[22px] font-semibold text-tinta">Revisa tu correo</h1>
          <p class="mt-2 text-[13px] leading-relaxed text-tinta-media">
            Te enviamos un enlace para confirmar la cuenta de administrador. Al confirmarlo podrás iniciar
            sesión y configurar tu restaurante.
          </p>
          <a
            routerLink="/login"
            class="mt-5 inline-block rounded-[10px] bg-terracota px-5 py-2.5 text-[13px] font-bold text-lino-calido hover:bg-terracota-hover"
          >
            Ir a iniciar sesión
          </a>
        </div>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="w-full max-w-[420px] rounded-2xl border border-borde bg-papel p-7"
        >
          <span class="mb-2 inline-block rounded-full bg-duna px-2.5 py-1 text-[10.5px] font-bold text-terracota-profundo">
            CONFIGURACIÓN INICIAL
          </span>
          <h1 class="m-0 font-serif text-[23px] font-semibold text-tinta">Crea tu cuenta de administrador</h1>
          <p class="mt-1 mb-5 text-[13px] leading-relaxed text-tinta-media">
            Es la primera y única cuenta propietaria. Desde ella darás de alta al resto del equipo (meseros,
            cocina y más administradores) y asignarás sus roles.
          </p>

          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="fullName">
            NOMBRE COMPLETO <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            formControlName="fullName"
            autocomplete="name"
            required
            placeholder="Ana Ríos"
            (blur)="nameTouched.set(true)"
            [attr.aria-invalid]="nameInvalid()"
            [attr.aria-describedby]="nameInvalid() ? 'name-error' : null"
            class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
            [class.border-borde]="!nameInvalid()"
            [class.border-rojizo]="nameInvalid()"
          />
          @if (nameInvalid()) {
            <p id="name-error" class="mt-1.5 mb-2.5 text-[11.5px] font-semibold text-rojizo">Escribe tu nombre.</p>
          } @else {
            <div class="mb-4"></div>
          }

          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="email">
            CORREO <span class="text-rojizo" aria-hidden="true">*</span>
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
              Escribe un correo válido.
            </p>
          } @else {
            <div class="mb-4"></div>
          }

          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="password">
            CONTRASEÑA <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="new-password"
              required
              placeholder="Mínimo 8 caracteres"
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
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              [attr.aria-pressed]="showPassword()"
              class="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[11px] font-bold text-terracota-profundo hover:bg-crema"
            >
              {{ showPassword() ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          @if (passwordInvalid()) {
            <p id="password-error" class="mt-1.5 mb-3.5 text-[11.5px] font-semibold text-rojizo">
              La contraseña debe tener al menos 8 caracteres.
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
              {{ error() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full cursor-pointer rounded-[10px] border-none bg-terracota py-[11px] text-[13.5px] font-bold text-lino-calido hover:bg-terracota-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading() ? 'Creando cuenta…' : 'Crear administrador' }}
          </button>
        </form>
      }

      <a routerLink="/" class="mt-6 text-[12.5px] font-semibold text-terracota-profundo hover:underline">
        ← Volver al menú del restaurante
      </a>
    </div>
  `,
})
export class RegisterAdminComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly nameTouched = signal(false);
  protected readonly emailTouched = signal(false);
  protected readonly passwordTouched = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected nameInvalid(): boolean {
    return this.nameTouched() && this.form.controls.fullName.invalid;
  }
  protected emailInvalid(): boolean {
    return this.emailTouched() && this.form.controls.email.invalid;
  }
  protected passwordInvalid(): boolean {
    return this.passwordTouched() && this.form.controls.password.invalid;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.nameTouched.set(true);
      this.emailTouched.set(true);
      this.passwordTouched.set(true);
      const first = this.form.controls.fullName.invalid
        ? 'fullName'
        : this.form.controls.email.invalid
          ? 'email'
          : 'password';
      document.getElementById(first)?.focus();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { fullName, email, password } = this.form.getRawValue();
      const user = await this.auth.signUpFirstAdmin({ fullName, email, password });
      if (user) {
        await this.router.navigateByUrl('/admin');
      } else {
        // El proyecto exige confirmar el correo antes de iniciar sesión.
        this.done.set(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      this.error.set(
        message.includes('already registered') || message.includes('registrado')
          ? 'Ese correo ya tiene una cuenta. Inicia sesión.'
          : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
