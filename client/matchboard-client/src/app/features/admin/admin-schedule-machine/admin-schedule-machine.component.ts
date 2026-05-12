import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ScheduleListComponent } from '../../job/schedule-list/schedule-list.component';

@Component({
  selector: 'admin-schedule-machine',
  standalone: true,
  imports: [ScheduleListComponent],
  template: `
    <schedule-list
      [machineId]="machineId()"
      [date]="scheduleDate()"
      [machineName]="machineName()"
    />
  `
})
export class AdminScheduleMachineComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly params = toSignal(this.route.paramMap, { initialValue: null });
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: null });

  readonly scheduleDate = computed(() => this.params()?.get('date') ?? null);
  readonly machineName = computed(() => this.queryParams()?.get('machine') ?? null);

  readonly machineId = computed<number | null>(() => {
    const value = this.params()?.get('machineId');
    if (value == null) return null;

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  });
}
