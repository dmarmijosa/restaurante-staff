/**
 * Barra superior de la plataforma (idéntica al diseño: fondo cacao, logo "R",
 * pestañas de área y versión). En la app real las pestañas son enlaces y solo
 * aparecen las áreas permitidas por el rol de la sesión; "Cliente" siempre
 * está disponible porque es la vista pública.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService, LANG_LABELS, type SupportedLang } from '../../core/i18n/language.service';

interface AreaLink {
  label: string;
  device: string;
  path: string;
}

@Component({
  selector: 'app-staff-topbar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-none items-center gap-4 bg-cacao px-[22px] py-[11px] text-lino">
      <a routerLink="/" class="flex items-center gap-2.5">
        <div
          class="flex h-7 w-7 items-center justify-center rounded-lg bg-terracota font-serif text-[15px] font-bold text-lino-calido"
        >
          R
        </div>
        <div>
          <div class="font-serif text-base leading-[1.1] font-semibold">Restaurante Staff</div>
          <div class="text-[10.5px] text-lino-apagado">{{ 'topbar.platform' | translate }}</div>
        </div>
      </a>
      <div class="flex-1"></div>
      <nav class="flex gap-1 rounded-full bg-white/8 p-1" [attr.aria-label]="'topbar.area.admin' | translate">
        @for (area of areas(); track area.path) {
          <a
            [routerLink]="area.path"
            routerLinkActive="!bg-lino !text-cacao"
            [routerLinkActiveOptions]="{ exact: area.path === '/' }"
            class="flex items-baseline gap-[7px] rounded-full px-4 py-[7px] text-[12.5px] font-semibold text-lino-tenue hover:opacity-90"
          >
            <span>{{ area.labelKey | translate }}</span>
            <span class="text-[10px] font-medium opacity-60">{{ area.deviceKey | translate }}</span>
          </a>
        }
      </nav>
      <!-- Selector de idioma -->
      <div class="relative">
        <select
          class="cursor-pointer rounded-md border border-lino/20 bg-transparent px-2 py-1 text-[11px] text-lino-gris hover:text-lino"
          [value]="lang.current()"
          (change)="changeLang($event)"
          [attr.aria-label]="'lang.' + lang.current() | translate"
        >
          @for (l of lang.supported; track l) {
            <option [value]="l">{{ langLabels[l] }}</option>
          }
        </select>
      </div>
      @if (auth.user(); as user) {
        <button
          type="button"
          (click)="signOut()"
          class="cursor-pointer text-[11px] text-lino-gris hover:text-lino"
        >
          {{ 'topbar.sign_out' | translate }} ({{ user.fullName.split(' ')[0] }})
        </button>
      }
      <div class="text-[11px] text-lino-apagado">{{ 'topbar.version' | translate }}</div>
    </div>
  `,
})
export class StaffTopbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly lang = inject(LanguageService);
  protected readonly langLabels = LANG_LABELS;
  private router = inject(Router);

  /** Áreas visibles según el rol; el admin ve todo, como en el diseño. */
  protected readonly areas = computed(() => {
    const role = this.auth.role();
    const links: Array<{ labelKey: string; deviceKey: string; path: string }> = [];
    if (role === 'admin') links.push({ labelKey: 'topbar.area.admin', deviceKey: 'topbar.area.desktop', path: '/admin' });
    if (role === 'admin' || role === 'mesero') links.push({ labelKey: 'topbar.area.waiter', deviceKey: 'topbar.area.tablet', path: '/mesero' });
    if (role === 'admin' || role === 'cocina') links.push({ labelKey: 'topbar.area.kitchen', deviceKey: 'topbar.area.screen', path: '/cocina' });
    if (role === 'admin' || role === 'cajero') links.push({ labelKey: 'topbar.area.cashier', deviceKey: 'topbar.area.register', path: '/cajero' });
    links.push({ labelKey: 'topbar.area.client', deviceKey: 'topbar.area.mobile_qr', path: '/' });
    return links;
  });

  protected changeLang(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.lang.use(select.value as SupportedLang);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
