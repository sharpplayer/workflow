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
  <div class="job-top-actions">
    <button type="button" (click)="logout()">Log Out</button>
    </div>
    <schedule-list [machineId]="workstationId()" />
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

    readonly workstationId = computed<number | null>(() => {
        const value = this.workstationIdParam();
        if (value == null) return null;

        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    });

    async logout() {
        await this.authService.logoutAll();
    }

}