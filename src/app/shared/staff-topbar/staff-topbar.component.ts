/**
 * Barra superior de la plataforma (idéntica al diseño: fondo cacao, logo "R",
 * pestañas de área y versión). En la app real las pestañas son enlaces y solo
 * aparecen las áreas permitidas por el rol de la sesión; "Cliente" siempre
 * está disponible porque es la vista pública.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface AreaLink {
  label: string;
  device: string;
  path: string;
}

@Component({
  selector: 'app-staff-topbar',
  imports: [RouterLink, RouterLinkActive],
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
          <div class="text-[10.5px] text-lino-apagado">Plataforma open source para restaurantes</div>
        </div>
      </a>
      <div class="flex-1"></div>
      <nav class="flex gap-1 rounded-full bg-white/8 p-1" aria-label="Áreas de la plataforma">
        @for (area of areas(); track area.path) {
          <a
            [routerLink]="area.path"
            routerLinkActive="!bg-lino !text-cacao"
            [routerLinkActiveOptions]="{ exact: area.path === '/' }"
            class="flex items-baseline gap-[7px] rounded-full px-4 py-[7px] text-[12.5px] font-semibold text-lino-tenue hover:opacity-90"
          >
            <span>{{ area.label }}</span>
            <span class="text-[10px] font-medium opacity-60">{{ area.device }}</span>
          </a>
        }
      </nav>
      @if (auth.user(); as user) {
        <button
          type="button"
          (click)="signOut()"
          class="cursor-pointer text-[11px] text-lino-gris hover:text-lino"
        >
          Salir ({{ user.fullName.split(' ')[0] }})
        </button>
      }
      <div class="text-[11px] text-lino-apagado">v0.4 · código abierto</div>
    </div>
  `,
})
export class StaffTopbarComponent {
  protected readonly auth = inject(AuthService);
  private router = inject(Router);

  /** Áreas visibles según el rol; el admin ve todo, como en el diseño. */
  protected readonly areas = computed<AreaLink[]>(() => {
    const role = this.auth.role();
    const links: AreaLink[] = [];
    if (role === 'admin') links.push({ label: 'Administrador', device: 'Escritorio', path: '/admin' });
    if (role === 'admin' || role === 'mesero') links.push({ label: 'Mesero', device: 'Tablet', path: '/mesero' });
    if (role === 'admin' || role === 'cocina') links.push({ label: 'Cocina', device: 'Pantalla', path: '/cocina' });
    links.push({ label: 'Cliente', device: 'Móvil · QR', path: '/' });
    return links;
  });

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
