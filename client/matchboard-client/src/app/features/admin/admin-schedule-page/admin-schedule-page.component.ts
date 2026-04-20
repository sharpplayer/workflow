import { Component } from '@angular/core';
import { AdminScheduleComponent, JobInput, MachineInput, RestTimesInput } from '../admin-schedule/admin-schedule.component';


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
export class AdminSchedulePageComponent {
    machines: MachineInput[] = [
        { machineId: 1, machineName: 'Saw', resetTime: 40 },
        { machineId: 2, machineName: 'Mill', resetTime: 30 },
        { machineId: 3, machineName: 'Drill', resetTime: 20 },
        { machineId: 4, machineName: 'Polish', resetTime: 10 },
    ];

    jobs: JobInput[] = [
        { jobPartId: 1001, requiredMachine: 1, stepNumber: 1, timeOnMachine: 30, width: 100, length: 150, thickness: 8 },
        { jobPartId: 1001, requiredMachine: 2, stepNumber: 2, timeOnMachine: 45, width: 100, length: 200, thickness: 8 },
        { jobPartId: 1001, requiredMachine: 4, stepNumber: 3, timeOnMachine: 20, width: 100, length: 150, thickness: 8 },

        { jobPartId: 1002, requiredMachine: 1, stepNumber: 1, timeOnMachine: 25, width: 80, length: 120, thickness: 6 },
        { jobPartId: 1002, requiredMachine: 3, stepNumber: 2, timeOnMachine: 35, width: 80, length: 120, thickness: 6 },

        { jobPartId: 1003, requiredMachine: 2, stepNumber: 1, timeOnMachine: 50, width: 90, length: 200, thickness: 10 },
        { jobPartId: 1003, requiredMachine: 4, stepNumber: 2, timeOnMachine: 40, width: 90, length: 200, thickness: 10 },

        { jobPartId: 1004, requiredMachine: 1, stepNumber: 1, timeOnMachine: 15, width: 60, length: 90, thickness: 4 },
        { jobPartId: 1004, requiredMachine: 3, stepNumber: 2, timeOnMachine: 30, width: 60, length: 90, thickness: 4 },
        { jobPartId: 1004, requiredMachine: 4, stepNumber: 3, timeOnMachine: 25, width: 60, length: 90, thickness: 4 },

        { jobPartId: 1005, requiredMachine: 2, stepNumber: 1, timeOnMachine: 60, width: 150, length: 220, thickness: 12 },
    ];

    restTimes: RestTimesInput = {
        times: 'Start:00:00-08:00;Mid Morning:10:00-10:15;Lunch:12:30-13:00;Afternoon:14:00-14:15;Close:16:00-24:00'
    };
}