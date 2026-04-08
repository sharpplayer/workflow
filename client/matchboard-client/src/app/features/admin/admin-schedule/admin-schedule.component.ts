import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService, SchedulableJobPart, SchedulableJobParts } from '../../../core/services/job.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';

@Component({
    selector: 'app-admin-schedule',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div>
            <label for="scheduleDate">Schedule Date:</label>

            <select
                id="scheduleDate"
                [ngModel]="selectedScheduleDate()"
                (ngModelChange)="selectedScheduleDate.set($event)"
                [disabled]="loadingDates()"
            >
                @for (date of scheduleDates(); track date.key) {
                    <option [value]="date.key">
                        {{ date.value }}
                    </option>
                }
            </select>

            <button
                type="button"
                (click)="getJobParts()"
                [disabled]="loadingDates() || loadingJobParts()"
            >
                {{ loadingJobParts() ? 'Loading...' : 'Get Job Parts' }}
            </button>
        </div>

        @if (errorMessage()) {
            <div style="color: red; margin-top: 10px;">
                {{ errorMessage() }}
            </div>
        }

        @if (jobParts().length > 0) {
            <div style="margin-top: 16px;">
                <h3>Job Parts</h3>

                <table
                    style="width: 100%; border-collapse: collapse; margin-top: 12px;"
                >
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ccc; padding: 8px;">Job Part ID</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Product</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Old Name</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Quantity</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">From Call Off</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Job ID</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Job Number</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Job Status</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Part No</th>
                            <th style="border: 1px solid #ccc; padding: 8px;">Job Parts</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (part of jobParts(); track part.jobPartId) {
                            <tr>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.jobPartId }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.product }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.oldName }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.quantity }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">
                                    {{ part.fromCallOff ? 'Yes' : 'No' }}
                                </td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.jobId }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.jobNumber }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.jobStatus }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.partNo }}</td>
                                <td style="border: 1px solid #ccc; padding: 8px;">{{ part.jobParts }}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        } @else if (!loadingJobParts() && hasLoadedJobParts()) {
            <div style="margin-top: 16px;">
                No job parts found.
            </div>
        }
    `,
    styleUrl: './admin-schedule.component.css'
})
export class AdminScheduleComponent implements OnInit {
    private readonly jobService = inject(JobService);
    private readonly configService = inject(ConfigService);

    readonly unscheduledLabel = '(Unscheduled)';

    readonly availableDates = signal<ConfigItem[]>([]);
    readonly selectedScheduleDate = signal<string>('');
    readonly jobParts = signal<SchedulableJobPart[]>([]);

    readonly loadingDates = signal(false);
    readonly loadingJobParts = signal(false);
    readonly hasLoadedJobParts = signal(false);
    readonly errorMessage = signal('');

    readonly scheduleDates = computed<ConfigItem[]>(() => [
        { key: '', value: this.unscheduledLabel },
        ...this.availableDates()
    ]);

    async ngOnInit(): Promise<void> {
        await this.loadScheduleDates();
    }

    async loadScheduleDates(): Promise<void> {
        this.loadingDates.set(true);
        this.errorMessage.set('');

        try {
            const response = await this.configService.getList('schedule-dates');
            console.log(response);

            this.availableDates.set(response.value ?? []);
            this.selectedScheduleDate.set('');
        } catch (error) {
            console.error('Failed to load schedule dates', error);
            this.errorMessage.set('Failed to load schedule dates.');
        } finally {
            this.loadingDates.set(false);
        }
    }

    async getJobParts(): Promise<void> {
        this.loadingJobParts.set(true);
        this.errorMessage.set('');
        this.jobParts.set([]);
        this.hasLoadedJobParts.set(false);

        try {
            const scheduleDate = this.selectedScheduleDate() || null;

            const response: SchedulableJobParts = await this.jobService.getJobParts(scheduleDate);
            this.jobParts.set(response.schedulable ?? []);
            this.hasLoadedJobParts.set(true);
        } catch (error) {
            console.error('Failed to load job parts', error);
            this.errorMessage.set('Failed to load job parts.');
        } finally {
            this.loadingJobParts.set(false);
        }
    }
}