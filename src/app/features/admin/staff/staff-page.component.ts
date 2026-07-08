/**
 * Meseros y turnos: altas, vacaciones, rotación de turno y baja del equipo.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { ToastService } from '../../../shared/toast/toast.service';
import { ChipBtnDirective } from '../../../shared/chip-btn.directive';
import { PasswordDialogComponent } from '../../../shared/password-dialog/password-dialog.component';
import { PasswordFieldComponent } from '../../../shared/password-field/password-field.component';
import { AVATAR_PALETTE, SHIFT_HOURS, SHIFT_LABELS, initialsOf } from '../../../shared/ui-maps';
import type { Shift, StaffRole } from '../../../core/domain/entities/entities';

const SHIFTS: Shift[] = ['manana', 'tarde', 'noche'];
const ROLES: StaffRole[] = ['mesero', 'cocina', 'cajero', 'admin'];
const TEAM_ROLES: Array<{ key: 'mesero' | 'cajero'; label: string }> = [
  { key: 'mesero', label: 'Mesero' },
  { key: 'cajero', label: 'Cajero' },
];

@Component({
  selector: 'app-staff-page',
  imports: [FormsModule, ChipBtnDirective, PasswordDialogComponent, PasswordFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[880px]" data-testid="admin-meseros">
      <div class="mb-[18px] flex items-end gap-4">
        <div class="flex-1">
          <h1 class="m-0 font-serif text-[27px] font-semibold">Meseros y turnos</h1>
          <p class="mt-1 mb-0 text-[13px] text-tinta-media">
            Altas, bajas, vacaciones y rotación de turnos del equipo de sala y caja.
            La cocina se abre en /cocina sin iniciar sesión.
          </p>
        </div>
        <button
          type="button"
          (click)="showForm.set(!showForm())"
          class="cursor-pointer rounded-[10px] border-none bg-terracota px-[18px] py-2.5 text-[13px] font-semibold text-lino-calido hover:bg-terracota-hover"
        >
          + Dar de alta
        </button>
      </div>

      @if (showForm()) {
        <div class="mb-[18px] flex flex-wrap items-center gap-3 rounded-[14px] border border-borde bg-papel px-[18px] py-4">
          <input
            [(ngModel)]="draftName"
            placeholder="Nombre completo"
            aria-label="Nombre completo"
            class="min-w-[200px] flex-1 rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
          />
          <input
            [(ngModel)]="draftEmail"
            type="email"
            inputmode="email"
            autocomplete="email"
            placeholder="correo@empleado.com"
            aria-label="Correo del empleado"
            class="min-w-[200px] flex-1 rounded-[9px] border-[1.5px] border-borde bg-papel px-3 py-[9px] text-[13px] text-tinta outline-none focus:border-terracota"
          />
          <app-password-field
            class="min-w-[180px] flex-1"
            inputId="staff-draft-password"
            [(value)]="draftPassword"
            placeholder="Contraseña (opcional)"
            ariaLabel="Contraseña inicial"
            autocomplete="new-password"
          />
          <div class="w-full text-[11px] text-tinta-media">
            Si dejas la contraseña vacía se generará una automática que podrás copiar al guardar.
          </div>
          <div class="flex gap-[5px]" role="group" aria-label="Rol del empleado">
            @for (role of teamRoles; track role.key) {
              <button chipBtn variant="terracota" [active]="draftRole() === role.key" type="button"
                (click)="draftRole.set(role.key)" class="px-3.5 py-2 text-[11.5px]">
                {{ role.label }}
              </button>
            }
          </div>
          <div class="flex gap-[5px]" role="group" aria-label="Turno">
            @for (shift of shifts; track shift) {
              <button chipBtn [active]="draftShift() === shift" type="button"
                (click)="draftShift.set(shift)" class="px-3.5 py-2 text-[11.5px]">
                {{ shiftLabels[shift] }}
              </button>
            }
          </div>
          <button
            type="button"
            (click)="save()"
            class="cursor-pointer rounded-[9px] border-none bg-tinta px-4 py-[9px] text-[12.5px] font-semibold text-lino"
          >
            Guardar
          </button>
        </div>
      }

      <div class="mb-5 grid grid-cols-3 gap-3">
        @for (summary of shiftSummary(); track summary.shift) {
          <div class="rounded-xl bg-panal px-4 py-3">
            <div class="flex items-baseline justify-between">
              <span class="text-[12.5px] font-bold">{{ shiftLabels[summary.shift] }}</span>
              <span class="text-[10.5px] text-tinta-media">{{ shiftHours[summary.shift] }}</span>
            </div>
            <div class="mt-[5px] text-xs text-tinta-suave">{{ summary.names }}</div>
          </div>
        }
      </div>

      <div class="overflow-hidden rounded-[14px] border border-borde bg-papel">
        @for (member of teamRows(); track member.id) {
          <div class="flex flex-wrap items-center gap-3.5 border-b border-panal px-[18px] py-3.5" data-testid="staff-row">
            <div
              class="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[13px] font-bold text-lino-calido"
              [style.background]="member.avatarColor"
            >
              {{ member.initials }}
            </div>
            <div class="min-w-[140px] flex-1">
              <div class="text-sm font-semibold">{{ member.fullName }}</div>
              <div class="mt-0.5 text-[11.5px] text-tinta-media">{{ member.email }}</div>
              <div class="mt-0.5 text-[11px] text-tinta-suave">{{ member.tablesLabel }}</div>
            </div>

            <label class="sr-only" [for]="'rol-' + member.id">Rol de {{ member.fullName }}</label>
            <select
              [id]="'rol-' + member.id"
              [ngModel]="member.role"
              (ngModelChange)="store.setRole(member.id, $event)"
              class="cursor-pointer rounded-full border-[1.5px] border-borde bg-papel px-2.5 py-1.5 text-[11.5px] font-semibold text-tinta-suave"
            >
              @for (role of roles; track role) {
                <option [value]="role">{{ roleLabels[role] }}</option>
              }
            </select>

            <span
              class="rounded-full px-[11px] py-1 text-[11px] font-bold"
              [class]="member.status === 'activo' ? 'bg-oliva-bg text-oliva-texto' : 'bg-ocre-bg text-ocre-texto'"
            >
              {{ member.status === 'activo' ? 'Activo' : 'Vacaciones' }}
            </span>
            @if (member.shift) {
              <button
                type="button"
                (click)="store.rotateShift(member.id)"
                class="cursor-pointer rounded-full border-[1.5px] border-borde bg-papel px-3 py-1.5 text-[11.5px] font-semibold text-tinta hover:bg-crema"
              >
                {{ shiftLabels[member.shift] }} ⟳
              </button>
            }
            <button
              type="button"
              (click)="openSetPassword(member)"
              class="cursor-pointer border-none bg-transparent text-[11.5px] font-semibold text-terracota-profundo hover:underline"
            >
              Contraseña
            </button>
            <button
              type="button"
              (click)="store.toggleVacation(member.id)"
              class="cursor-pointer border-none bg-transparent text-[11.5px] font-semibold text-tinta-suave hover:underline"
            >
              {{ member.status === 'activo' ? 'Vacaciones' : 'Reactivar' }}
            </button>
            <button
              type="button"
              (click)="requestDelete(member.id)"
              class="cursor-pointer border-none bg-transparent text-[11.5px] font-semibold text-rojizo hover:underline"
            >
              {{ confirmingId() === member.id ? '¿Eliminar datos? Confirmar' : 'Dar de baja' }}
            </button>
          </div>
        }
      </div>
      <div class="mt-2.5 text-[11px] text-tinta-media">
        Usa «Contraseña» para asignar una nueva al empleado. «Dar de baja» elimina sus datos de forma permanente.
      </div>

      <app-password-dialog
        [open]="pwdDialogOpen()"
        [mode]="pwdDialogMode()"
        [title]="pwdDialogTitle()"
        [subtitle]="pwdDialogSubtitle()"
        [email]="pwdDialogEmail()"
        [password]="pwdDialogPassword()"
        (saved)="onPasswordSaved($event)"
        (closed)="closePasswordDialog()"
      />
    </div>
  `,
})
export class StaffPageComponent {
  protected readonly store = inject(RestaurantStore);
  private toast = inject(ToastService);

  protected readonly shifts = SHIFTS;
  protected readonly roles = ROLES;
  protected readonly teamRoles = TEAM_ROLES;
  protected readonly roleLabels: Record<StaffRole, string> = {
    admin: 'Admin',
    mesero: 'Mesero',
    cocina: 'Cocina',
    cajero: 'Cajero',
  };
  protected readonly shiftLabels = SHIFT_LABELS;
  protected readonly shiftHours = SHIFT_HOURS;

  protected readonly showForm = signal(false);
  protected draftName = '';
  protected draftEmail = '';
  protected draftPassword = '';
  protected readonly draftRole = signal<'mesero' | 'cajero'>('mesero');
  protected readonly draftShift = signal<Shift>('manana');
  protected readonly confirmingId = signal<string | null>(null);

  protected readonly pwdDialogOpen = signal(false);
  protected readonly pwdDialogMode = signal<'reveal' | 'set'>('set');
  protected readonly pwdDialogTitle = signal('Contraseña');
  protected readonly pwdDialogSubtitle = signal('');
  protected readonly pwdDialogEmail = signal('');
  protected readonly pwdDialogPassword = signal('');
  private pwdTargetId: string | null = null;

  protected readonly teamRows = computed(() =>
    this.store
      .staff()
      .filter((s) => s.role !== 'admin' && s.role !== 'cocina')
      .map((member, i) => ({
        ...member,
        initials: initialsOf(member.fullName),
        avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
        tablesLabel:
          member.status === 'vacaciones'
            ? 'Sin mesas mientras está de vacaciones'
            : member.role === 'cocina'
              ? 'Equipo de cocina'
              : member.role === 'cajero'
                ? 'Caja y cobros'
                : member.tables.length
                  ? 'Mesas ' + member.tables.join(', ')
                  : 'Sin mesas asignadas',
      })),
  );

  protected readonly shiftSummary = computed(() =>
    SHIFTS.map((shift) => {
      const names = this.store
        .staff()
        .filter((s) => s.role === 'mesero' && s.shift === shift && s.status === 'activo')
        .map((s) => s.fullName.split(' ')[0]);
      return { shift, names: names.length ? names.join(', ') : '— sin cubrir —' };
    }),
  );

  protected openSetPassword(member: { id: string; fullName: string; email: string }): void {
    this.pwdTargetId = member.id;
    this.pwdDialogMode.set('set');
    this.pwdDialogTitle.set(`Contraseña de ${member.fullName}`);
    this.pwdDialogSubtitle.set('El empleado entrará en /login con su correo y esta contraseña.');
    this.pwdDialogEmail.set(member.email);
    this.pwdDialogPassword.set('');
    this.pwdDialogOpen.set(true);
  }

  protected showReveal(email: string, password: string): void {
    this.pwdTargetId = null;
    this.pwdDialogMode.set('reveal');
    this.pwdDialogTitle.set('Cuenta creada');
    this.pwdDialogSubtitle.set('Copia la contraseña y compártela con el empleado.');
    this.pwdDialogEmail.set(email);
    this.pwdDialogPassword.set(password);
    this.pwdDialogOpen.set(true);
  }

  protected closePasswordDialog(): void {
    this.pwdDialogOpen.set(false);
    this.pwdTargetId = null;
  }

  protected async onPasswordSaved(password: string): Promise<void> {
    if (this.pwdTargetId) {
      try {
        await this.store.setStaffPassword(this.pwdTargetId, password);
        this.closePasswordDialog();
      } catch (e) {
        this.toast.show(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
      }
      return;
    }
    this.closePasswordDialog();
  }

  protected async save(): Promise<void> {
    const name = this.draftName.trim();
    const email = this.draftEmail.trim();
    const password = this.draftPassword.trim() || undefined;
    if (!name) {
      this.toast.show('Escribe el nombre del empleado');
      return;
    }
    if (!email) {
      this.toast.show('Escribe el correo del empleado');
      return;
    }
    if (password && password.length < 8) {
      this.toast.show('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    try {
      const tempPassword = await this.store.addTeamMember(
        name,
        email,
        this.draftRole(),
        this.draftShift(),
        password,
      );
      if (tempPassword) {
        this.showReveal(email, tempPassword);
      } else {
        this.toast.show('Cuenta creada. El empleado puede entrar con la contraseña que definiste.');
      }
      this.draftName = '';
      this.draftEmail = '';
      this.draftPassword = '';
      this.showForm.set(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo dar de alta al empleado';
      this.toast.show(message);
    }
  }

  protected async requestDelete(id: string): Promise<void> {
    if (this.confirmingId() !== id) {
      this.confirmingId.set(id);
      return;
    }
    this.confirmingId.set(null);
    await this.store.deleteStaffPermanently(id);
  }
}
