/**
 * Ajustes del restaurante: identidad (nombre y logo) y cuentas de
 * administración — según el diseño. La cuenta propietaria no puede
 * eliminarse; el resto de administradores sí (eliminación permanente).
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { ToastService } from '../../../shared/toast/toast.service';
import { AVATAR_PALETTE, initialsOf } from '../../../shared/ui-maps';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[640px]" data-testid="admin-ajustes">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">Ajustes del restaurante</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">
          Identidad del restaurante y cuentas con acceso al panel.
        </p>
      </div>

      <!-- Identidad -->
      <div class="mb-3.5 rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
        <div class="mb-3 text-[13px] font-semibold">Identidad</div>
        <div class="flex items-center gap-4">
          <label
            class="group relative flex h-16 w-16 flex-none cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-panal font-mono text-[9px] text-tinta-media"
          >
            @if (store.settings().logoUrl; as logo) {
              <img [src]="logo" alt="Logo del restaurante" class="h-full w-full object-cover" />
            } @else {
              <span>logo</span>
            }
            <span
              class="absolute inset-x-0 bottom-0 bg-cacao/80 py-0.5 text-center text-[8.5px] font-bold text-lino opacity-0 group-hover:opacity-100"
            >
              Cambiar
            </span>
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              aria-label="Subir logo del restaurante"
              (change)="onLogo($event)"
            />
          </label>
          <div class="flex-1">
            <div class="mb-[5px] text-[11px] font-semibold text-tinta-media">Nombre del restaurante</div>
            <input
              [ngModel]="store.settings().name"
              (ngModelChange)="store.setRestaurantName($event)"
              aria-label="Nombre del restaurante"
              class="w-full rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-sm font-semibold text-tinta outline-none focus:border-terracota"
            />
            <div class="mt-1.5 text-[11px] text-tinta-media">
              Se actualiza en todo el sistema: panel, tablet del mesero y menú del cliente.
            </div>
          </div>
        </div>
      </div>

      <!-- Administradores -->
      <div class="rounded-[14px] border border-borde bg-papel px-5 py-[18px]">
        <div class="mb-3.5 flex items-center gap-3">
          <span class="flex-1 text-[13px] font-semibold">Administradores</span>
          <button
            type="button"
            (click)="showForm.set(!showForm())"
            class="cursor-pointer rounded-[9px] border-none bg-terracota px-3.5 py-2 text-xs font-semibold text-lino-calido hover:bg-terracota-hover"
          >
            + Agregar administrador
          </button>
        </div>

        @if (showForm()) {
          <div class="mb-3.5 flex flex-wrap gap-2.5">
            <input
              [(ngModel)]="draftName"
              placeholder="Nombre completo"
              aria-label="Nombre completo"
              class="min-w-[160px] flex-1 rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
            />
            <input
              [(ngModel)]="draftEmail"
              placeholder="correo@restaurante.mx"
              aria-label="Correo"
              class="min-w-[160px] flex-1 rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
            />
            <button
              type="button"
              (click)="save()"
              class="cursor-pointer rounded-[9px] border-none bg-tinta px-4 py-[9px] text-[12.5px] font-semibold text-lino"
            >
              Guardar
            </button>
          </div>
        }

        <div class="flex flex-col">
          @for (admin of adminRows(); track admin.id) {
            <div class="flex items-center gap-3 border-b border-panal px-1 py-[11px]" data-testid="admin-row">
              <div
                class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-xs font-bold text-lino-calido"
                [style.background]="admin.avatarColor"
              >
                {{ admin.initials }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[13.5px] font-semibold">{{ admin.fullName }}</div>
                <div class="text-[11.5px] text-tinta-media">{{ admin.email || 'sin correo' }}</div>
              </div>
              <span
                class="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
                [class]="admin.isOwner ? 'bg-duna text-terracota-profundo' : 'bg-panal text-tinta-suave'"
              >
                {{ admin.isOwner ? 'Propietaria' : 'Administrador' }}
              </span>
              <button
                type="button"
                (click)="requestDelete(admin.id, admin.isOwner)"
                class="cursor-pointer border-none bg-transparent text-[11.5px] font-semibold text-rojizo hover:underline"
              >
                {{ confirmingId() === admin.id ? '¿Seguro? Confirmar' : 'Eliminar' }}
              </button>
            </div>
          }
        </div>
        <div class="mt-2.5 text-[11px] text-tinta-media">
          Cada administrador inicia sesión con su correo. La cuenta propietaria no puede eliminarse.
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  protected readonly store = inject(RestaurantStore);
  private toast = inject(ToastService);

  protected readonly showForm = signal(false);
  protected draftName = '';
  protected draftEmail = '';
  protected readonly confirmingId = signal<string | null>(null);

  /** Sube el logo elegido a Storage. */
  protected onLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.store.setLogoFromFile(file);
    input.value = '';
  }

  protected readonly adminRows = computed(() =>
    this.store.admins().map((admin, i) => ({
      ...admin,
      initials: initialsOf(admin.fullName),
      avatarColor: ['#C1683C', '#5F7C90', '#7C905F', '#8A6B85'][i % 4],
    })),
  );

  protected async save(): Promise<void> {
    const name = this.draftName.trim();
    if (!name) {
      this.toast.show('Escribe el nombre del administrador');
      return;
    }
    await this.store.addAdmin(name, this.draftEmail.trim());
    this.draftName = '';
    this.draftEmail = '';
    this.showForm.set(false);
  }

  protected async requestDelete(id: string, isOwner: boolean): Promise<void> {
    if (isOwner) {
      this.toast.show('La cuenta propietaria no puede eliminarse');
      return;
    }
    if (this.confirmingId() !== id) {
      this.confirmingId.set(id);
      return;
    }
    this.confirmingId.set(null);
    await this.store.deleteStaffPermanently(id);
  }
}
