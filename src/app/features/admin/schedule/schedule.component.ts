/**
 * Horario de trabajo (admin). Define el horario semanal de cada empleado
 * (lunes→domingo): por día, si trabaja y en qué franja. Cada empleado ve su
 * propio horario en la barra superior, así que esto influye directamente en
 * los trabajadores.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RestaurantStore } from '../../../core/application/restaurant.store';
import { defaultWorkSchedule, type DaySchedule, type WorkSchedule } from '../../../core/domain/entities/entities';

@Component({
  selector: 'app-schedule',
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[860px]" data-testid="admin-horarios">
      <div class="mb-[18px]">
        <h1 class="m-0 font-serif text-[27px] font-semibold">{{ 'admin.schedule.title' | translate }}</h1>
        <p class="mt-1 mb-0 text-[13px] text-tinta-media">{{ 'admin.schedule.subtitle' | translate }}</p>
      </div>

      <!-- Selección de empleado -->
      <div class="mb-4 flex flex-wrap gap-2">
        @for (w of workers(); track w.id) {
          <button
            type="button"
            (click)="selectedId.set(w.id)"
            class="cursor-pointer rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition"
            [class]="selectedId() === w.id ? 'border-terracota bg-terracota text-lino-calido' : 'border-borde bg-papel text-tinta-suave hover:border-terracota'"
          >
            {{ w.fullName }}
          </button>
        }
        @if (workers().length === 0) {
          <p class="text-[13px] text-tinta-media">{{ 'admin.schedule.no_staff' | translate }}</p>
        }
      </div>

      @if (editing(); as sched) {
        <div class="overflow-hidden rounded-[14px] border border-borde bg-papel">
          @for (day of sched.days; track $index) {
            <div class="flex flex-wrap items-center gap-3 border-b border-panal px-4 py-3 last:border-0">
              <span class="w-24 text-[13px] font-semibold">{{ 'weekday.' + $index | translate }}</span>

              <label class="flex cursor-pointer items-center gap-1.5 text-[12px] text-tinta-suave">
                <input
                  type="checkbox"
                  [checked]="!day.off"
                  (change)="toggleOff($index, $any($event.target).checked)"
                  class="h-4 w-4 accent-[color:var(--color-terracota)]"
                />
                {{ 'admin.schedule.works' | translate }}
              </label>

              @if (!day.off) {
                <div class="flex items-center gap-2">
                  <input
                    type="time"
                    [ngModel]="day.start"
                    (ngModelChange)="setTime($index, 'start', $event)"
                    class="min-h-9 rounded-[9px] border-[1.5px] border-borde bg-crema px-2.5 py-1 text-[12.5px] text-tinta outline-none focus:border-terracota"
                  />
                  <span class="text-tinta-media">–</span>
                  <input
                    type="time"
                    [ngModel]="day.end"
                    (ngModelChange)="setTime($index, 'end', $event)"
                    class="min-h-9 rounded-[9px] border-[1.5px] border-borde bg-crema px-2.5 py-1 text-[12.5px] text-tinta outline-none focus:border-terracota"
                  />
                </div>
              } @else {
                <span class="rounded-full bg-panal px-2.5 py-[3px] text-[11px] font-semibold text-tinta-media">
                  {{ 'admin.schedule.day_off' | translate }}
                </span>
              }
            </div>
          }
        </div>

        <div class="mt-4 flex items-center gap-2.5">
          <button
            type="button"
            (click)="save()"
            [disabled]="saving()"
            class="cursor-pointer rounded-[10px] border-none bg-terracota px-5 py-2.5 text-[13px] font-semibold text-lino-calido hover:bg-terracota-hover disabled:opacity-60"
          >
            {{ 'admin.schedule.save' | translate }}
          </button>
          <span class="text-[11.5px] text-tinta-media">{{ weeklyHours() }} {{ 'admin.schedule.weekly_hours' | translate }}</span>
        </div>
      }
    </div>
  `,
})
export class ScheduleComponent {
  protected readonly store = inject(RestaurantStore);
  private translate = inject(TranslateService);

  /** Empleados con horario (todos salvo administradores). */
  protected readonly workers = computed(() => this.store.staff().filter((s) => s.role !== 'admin'));

  protected readonly selectedId = signal<string | null>(null);

  /** Copia editable del horario del empleado seleccionado. */
  protected readonly draft = signal<WorkSchedule | null>(null);

  protected readonly saving = signal(false);

  /** Horario en edición: se inicializa desde el store o por defecto. */
  protected readonly editing = computed<WorkSchedule | null>(() => {
    const id = this.selectedId() ?? this.workers()[0]?.id ?? null;
    if (!id) return null;
    const d = this.draft();
    if (d && d.staffId === id) return d;
    const existing = this.store.schedules().find((s) => s.staffId === id);
    const initial = existing ? structuredClone(existing) : defaultWorkSchedule(id);
    return initial;
  });

  protected readonly weeklyHours = computed(() => {
    const sched = this.editing();
    if (!sched) return 0;
    const mins = sched.days.reduce((acc, d) => (d.off ? acc : acc + this.diffMinutes(d.start, d.end)), 0);
    return Math.round((mins / 60) * 10) / 10;
  });

  private diffMinutes(start: string, end: string): number {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0, eh * 60 + em - (sh * 60 + sm));
  }

  private mutate(fn: (s: WorkSchedule) => void): void {
    const base = structuredClone(this.editing()!);
    fn(base);
    this.draft.set(base);
  }

  protected toggleOff(dayIdx: number, works: boolean): void {
    this.mutate((s) => (s.days[dayIdx].off = !works));
  }

  protected setTime(dayIdx: number, field: keyof Pick<DaySchedule, 'start' | 'end'>, value: string): void {
    this.mutate((s) => (s.days[dayIdx][field] = value));
  }

  protected async save(): Promise<void> {
    const sched = this.editing();
    if (!sched) return;
    this.saving.set(true);
    try {
      await this.store.saveSchedule(sched);
    } finally {
      this.saving.set(false);
    }
  }
}
