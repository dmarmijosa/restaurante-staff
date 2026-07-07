/**
 * Bootstrap de un nuevo restaurante (tenant) + su primer administrador.
 *
 * Accesible desde /nuevo-restaurante (siempre) y desde /registro-inicial
 * (legacy, con guard). Flujo:
 *  1. El formulario recoge: nombre del restaurante, slug, nombre completo,
 *     correo y contraseña del administrador.
 *  2. Se crea el restaurante vía RPC `create_restaurant` → restaurant_id.
 *  3. Se hace signUp con el restaurant_id en los metadatos.
 *  4. El trigger `handle_new_user` crea el perfil admin+propietario.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-register-admin',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
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
          <div class="text-[11px] text-tinta-media">{{ 'topbar.platform' | translate }}</div>
        </div>
      </div>

      @if (done()) {
        <div class="w-full max-w-[420px] rounded-2xl border border-borde bg-papel p-7 text-center">
          <h1 class="m-0 font-serif text-[22px] font-semibold text-tinta">{{ 'register.confirm_title' | translate }}</h1>
          <p class="mt-2 text-[13px] leading-relaxed text-tinta-media">
            {{ 'register.confirm_msg' | translate }}
          </p>
          <a
            routerLink="/login"
            class="mt-5 inline-block rounded-[10px] bg-terracota px-5 py-2.5 text-[13px] font-bold text-lino-calido hover:bg-terracota-hover"
          >
            {{ 'register.confirm_login' | translate }}
          </a>
        </div>
      } @else {
        <form
          [formGroup]="form"
          (ngSubmit)="submit()"
          class="w-full max-w-[420px] rounded-2xl border border-borde bg-papel p-7"
          novalidate
        >
          <span class="mb-2 inline-block rounded-full bg-duna px-2.5 py-1 text-[10.5px] font-bold text-terracota-profundo">
            {{ 'register.badge' | translate }}
          </span>
          <h1 class="m-0 font-serif text-[23px] font-semibold text-tinta">{{ 'register.title' | translate }}</h1>
          <p class="mt-1 mb-5 text-[13px] leading-relaxed text-tinta-media">
            {{ 'register.subtitle' | translate }}
          </p>

          <!-- Nombre del restaurante -->
          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="restaurantName">
            NOMBRE DEL RESTAURANTE <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <input
            id="restaurantName"
            type="text"
            formControlName="restaurantName"
            autocomplete="organization"
            required
            placeholder="Casa Nogal"
            (blur)="restaurantNameTouched.set(true)"
            (input)="autoSlug()"
            [attr.aria-invalid]="restaurantNameInvalid()"
            [attr.aria-describedby]="restaurantNameInvalid() ? 'rname-error' : null"
            class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
            [class.border-borde]="!restaurantNameInvalid()"
            [class.border-rojizo]="restaurantNameInvalid()"
          />
          @if (restaurantNameInvalid()) {
            <p id="rname-error" class="mt-1.5 mb-2.5 text-[11.5px] font-semibold text-rojizo">Escribe el nombre del restaurante.</p>
          } @else {
            <div class="mb-4"></div>
          }

          <!-- Slug (URL del menú QR) -->
          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="slug">
            URL DEL MENÚ (slug) <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[12px] text-tinta-media whitespace-nowrap">/</span>
            <input
              id="slug"
              type="text"
              formControlName="slug"
              required
              placeholder="casa-nogal"
              (blur)="slugTouched.set(true)"
              [attr.aria-invalid]="slugInvalid()"
              [attr.aria-describedby]="slugInvalid() ? 'slug-error' : null"
              class="min-h-11 flex-1 rounded-[9px] border-[1.5px] bg-papel px-3 py-[9px] text-[13px] font-mono text-tinta outline-none focus:border-terracota"
              [class.border-borde]="!slugInvalid()"
              [class.border-rojizo]="slugInvalid()"
            />
          </div>
          @if (slugInvalid()) {
            <p id="slug-error" class="mb-2.5 text-[11.5px] font-semibold text-rojizo">Solo letras, números y guiones (mín. 2 caracteres).</p>
          } @else {
            <div class="mb-4"></div>
          }

          <div class="my-4 border-t border-panal"></div>
          <p class="mb-4 text-[12px] text-tinta-media">Cuenta de administrador propietario</p>

          <!-- Nombre completo -->
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

          <!-- Correo -->
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

          <!-- Contraseña -->
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
            <div class="mb-4"></div>
          }

          <!-- Confirmar contraseña -->
          <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="confirmPassword">
            CONFIRMAR CONTRASEÑA <span class="text-rojizo" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="confirmPassword"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="confirmPassword"
              autocomplete="new-password"
              required
              placeholder="Repite tu contraseña"
              (blur)="confirmPasswordTouched.set(true)"
              [attr.aria-invalid]="confirmPasswordInvalid()"
              [attr.aria-describedby]="confirmPasswordInvalid() ? 'confirm-error' : null"
              class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel py-[9px] pr-16 pl-3 text-[13px] text-tinta outline-none focus:border-terracota"
              [class.border-borde]="!confirmPasswordInvalid()"
              [class.border-rojizo]="confirmPasswordInvalid()"
            />
          </div>
          @if (confirmPasswordInvalid()) {
            <p id="confirm-error" class="mt-1.5 mb-3.5 text-[11.5px] font-semibold text-rojizo">
              Las contraseñas no coinciden.
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
            [disabled]="loading()"
            class="w-full cursor-pointer rounded-[10px] border-none bg-terracota py-[11px] text-[13.5px] font-bold text-lino-calido hover:bg-terracota-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ loading() ? 'Creando restaurante…' : 'Crear restaurante y cuenta' }}
          </button>
        </form>
      }

      <a routerLink="/" class="mt-6 text-[12.5px] font-semibold text-terracota-profundo hover:underline">
        {{ 'register.back_to_menu' | translate }}
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

  protected readonly restaurantNameTouched = signal(false);
  protected readonly slugTouched = signal(false);
  protected readonly nameTouched = signal(false);
  protected readonly emailTouched = signal(false);
  protected readonly passwordTouched = signal(false);
  protected readonly confirmPasswordTouched = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    restaurantName: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-z0-9-]+$/)]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  protected restaurantNameInvalid = computed(
    () => this.restaurantNameTouched() && this.form.controls.restaurantName.invalid,
  );
  protected slugInvalid = computed(() => this.slugTouched() && this.form.controls.slug.invalid);
  protected nameInvalid = computed(() => this.nameTouched() && this.form.controls.fullName.invalid);
  protected emailInvalid = computed(() => this.emailTouched() && this.form.controls.email.invalid);
  protected passwordInvalid = computed(() => this.passwordTouched() && this.form.controls.password.invalid);
  protected confirmPasswordInvalid = computed(
    () =>
      this.confirmPasswordTouched() &&
      (this.form.controls.confirmPassword.invalid || this.form.hasError('passwordsMismatch')),
  );

  /** Genera automáticamente el slug desde el nombre del restaurante. */
  protected autoSlug(): void {
    const name = this.form.controls.restaurantName.value;
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.form.controls.slug.setValue(slug);
  }

  protected async submit(): Promise<void> {
    this.restaurantNameTouched.set(true);
    this.slugTouched.set(true);
    this.nameTouched.set(true);
    this.emailTouched.set(true);
    this.passwordTouched.set(true);
    this.confirmPasswordTouched.set(true);

    if (this.form.invalid) {
      const firstInvalid = (['restaurantName', 'slug', 'fullName', 'email', 'password'] as const).find(
        (k) => this.form.controls[k].invalid,
      );
      document.getElementById(firstInvalid === 'restaurantName' ? 'restaurantName' : (firstInvalid ?? 'fullName'))?.focus();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    try {
      const { restaurantName, slug, fullName, email, password } = this.form.getRawValue();

      // Paso 1: crear el restaurante (tenant).
      const restaurantId = await this.auth.createRestaurant(restaurantName, slug);

      // Paso 2: registrar al primer admin con el restaurant_id en los metadatos.
      const user = await this.auth.signUpFirstAdmin({ fullName, email, password, restaurantId });

      if (user) {
        await this.router.navigateByUrl('/admin');
      } else {
        this.done.set(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      this.error.set(
        message.includes('already registered') || message.includes('registrado')
          ? 'register.err_already_registered'
          : message.includes('duplicate') || message.includes('slug')
            ? 'register.err_slug_taken'
            : 'register.err_unknown',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
