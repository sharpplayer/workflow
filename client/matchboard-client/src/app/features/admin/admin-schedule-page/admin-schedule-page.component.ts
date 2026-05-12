import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AdminScheduleComponent,
  RestTimesInput,
} from '../admin-schedule/admin-schedule.component';
import { ConfigService, MachineInput } from '../../../core/services/config.service';
import {
  JobService,
  ScheduledJobPartView,
  SchedulableJobPart
} from '../../../core/services/job.service';

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

      const lockedJobs = this.scheduleDate
        ? await this.loadLockedSchedule(this.scheduleDate)
        : [];

      this.machines = allMachines;
      this.jobs = [...lockedJobs, ...jobs];
      this.loading = false;

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Failed to load schedule data', error);

      this.error = 'Failed to load schedule data.';
      this.loading = false;

      this.cdr.detectChanges();
    }
  }

  private async loadLockedSchedule(
    date: string
  ): Promise<SchedulableJobPart[]> {
    const scheduled = await this.jobService.getJobsForScheduleDate(date) ?? [];
    const stepsByJobPart = new Map<number, number>();

    for (const job of scheduled) {
      stepsByJobPart.set(
        job.jobPartId,
        Math.max(stepsByJobPart.get(job.jobPartId) ?? 0, job.stepNumber)
      );
    }

    return scheduled.map(job => this.toLockedJob(job, stepsByJobPart.get(job.jobPartId) ?? job.stepNumber));
  }

  private toLockedJob(job: ScheduledJobPartView, steps: number): SchedulableJobPart {
    return {
      operationId: job.operationId,
      jobPartId: job.jobPartId,
      jobId: job.jobId,
      jobNumber: job.jobNumber,
      product: job.productName,
      oldName: job.productName,
      machineId: job.machineId,
      quantity: job.quantity,
      stepNumber: job.stepNumber,
      width: job.width,
      length: job.length,
      thickness: job.thickness,
      partStatus: job.status,
      jobStatus: job.status,
      partNo: job.partNumber,
      jobParts: job.jobParts,
      dueDate: new Date(job.dueDate),
      timeOnMachineSeconds: job.plannedMinutes * 60,
      timeForPacksSeconds: job.packMinutes * 60,
      steps,
      productId: 0,
      locked: true,
      plannedStart: job.plannedStart,
      plannedFinish: job.plannedFinish,
      setupMinutes: job.setupMinutes,
      plannedMinutes: job.plannedMinutes,
      breakMinutes: job.breakMinutes,
      packMinutes: job.packMinutes
    };
  }
}
