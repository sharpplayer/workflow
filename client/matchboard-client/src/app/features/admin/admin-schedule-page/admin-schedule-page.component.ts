import { Component, OnInit, inject } from '@angular/core';
import {
    AdminScheduleComponent,
    RestTimesInput
} from '../admin-schedule/admin-schedule.component';
import { ConfigService, MachineInput } from '../../../core/services/config.service';
import { JobService, SchedulableJobPart } from '../../../core/services/job.service';

@Component({
    selector: 'admin-schedule-page',
    standalone: true,
    imports: [AdminScheduleComponent],
    template: `
    <app-admin-schedule
      [machines]="machines"
      [jobs]="jobs"
      [restTimes]="restTimes">
    </app-admin-schedule>
  `,
})
export class AdminSchedulePageComponent implements OnInit {
    private readonly configService = inject(ConfigService);
    private readonly jobService = inject(JobService);

    machines: MachineInput[] = [];

    jobs: SchedulableJobPart[] = [];

    restTimes: RestTimesInput = {
        times: 'Start:00:00-08:00;Mid Morning:10:00-10:15;Lunch:12:30-13:00;Afternoon:14:00-14:15;Close:16:00-24:00'
    };

    async ngOnInit(): Promise<void> {
        const allMachines = await this.configService.getMachineList();
        this.jobs = await this.jobService.getJobSchedulableParts();

        const usedMachineIds = new Set(
            this.jobs.map(job => job.machineId)
        );

        this.machines = allMachines.filter(machine =>
            usedMachineIds.has(machine.id)
        );
    }
}