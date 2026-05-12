import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AdminScheduleComponent,
  RestTimesInput,
} from '../admin-schedule/admin-schedule.component';
import { ConfigService, MachineInput } from '../../../core/services/config.service';
import { JobService, SchedulableJobPart } from '../../../core/services/job.service';

@Component({
  selector: 'admin-schedule-page',
  standalone: true,
  imports: [AdminScheduleComponent],
  template: `
    @if (loading) {
      <div style="padding: 1rem;">Loading schedule data...</div>
    }

    @if (error) {
      <div style="padding: 1rem; color: red;">
        {{ error }}
      </div>
    }

    @if (!loading && !error) {
      <app-admin-schedule
        [machines]="machines"
        [jobs]="jobs"
        [initialScheduleDate]="scheduleDate"
        [restTimes]="restTimes">
      </app-admin-schedule>
    }
  `,
})
export class AdminSchedulePageComponent implements OnInit {
  private readonly configService = inject(ConfigService);
  private readonly jobService = inject(JobService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);

  machines: MachineInput[] = [];
  jobs: SchedulableJobPart[] = [];
  scheduleDate: string | null = null;

  loading = true;
  error: string | null = null;

  restTimes: RestTimesInput = {
    times: 'Start:00:00-08:00;Mid Morning:10:00-10:15;Lunch:12:30-13:00;Afternoon:14:00-14:15;Close:16:00-24:00',
  };

  async ngOnInit(): Promise<void> {
    try {
      this.scheduleDate = this.route.snapshot.paramMap.get('date');

      const [allMachines, jobs] = await Promise.all([
        this.configService.getMachineList(),
        this.jobService.getJobSchedulableParts(),
      ]);

      this.machines = allMachines;
      this.jobs = jobs;
      this.loading = false;

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load schedule data', error);

      this.error = 'Failed to load schedule data.';
      this.loading = false;

      this.cdr.detectChanges();
    }
  }
}
