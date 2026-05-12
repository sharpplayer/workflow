import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ScheduleListComponent } from '../schedule-list/schedule-list.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'schedule-page',
    standalone: true,
    imports: [ScheduleListComponent],
    template: `
  <div class="schedule-page">
    <div class="job-top-actions">
      @if (showLogout()) {
        <button type="button" class="logout-button" (click)="logout()">Log Out</button>
      }
    </div>

    <schedule-list
      [machineId]="workstationId()"
      [date]="scheduleDate()"
      [machineName]="machineName()"
    />
  </div>
  `,
    styleUrl: './schedule-page.component.css'
})
export class SchedulePageComponent {
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);

    private workstationIdParam = toSignal(
        this.route.paramMap.pipe(map(params => params.get('workstationId'))),
        { initialValue: null }
    );

    private queryParams = toSignal(this.route.queryParamMap, { initialValue: null });

    readonly workstationId = computed<number | null>(() => {
        const value = this.workstationIdParam();
        if (value == null) return null;

        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    });

    readonly scheduleDate = computed(() => this.queryParams()?.get('date') ?? null);

    readonly machineName = computed(() => this.queryParams()?.get('machine') ?? null);

    readonly showLogout = computed(() => this.queryParams()?.get('admin') !== 'true');

    async logout() {
        await this.authService.logoutAll();
    }

}
