import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../../core/services/job.service';
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

        @if (jobParts()) {
            <div style="margin-top: 16px;">
                <h3>Job Parts</h3>
                <pre>{{ jobParts() | json }}</pre>
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
    readonly jobParts = signal<any | null>(null);

    readonly loadingDates = signal(false);
    readonly loadingJobParts = signal(false);
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
        this.jobParts.set(null);

        try {
            const scheduleDate = this.selectedScheduleDate() || null;

            // const parts = await this.jobService.getJobParts(scheduleDate);
            // this.jobParts.set(parts);
        } catch (error) {
            console.error('Failed to load job parts', error);
            this.errorMessage.set('Failed to load job parts.');
        } finally {
            this.loadingJobParts.set(false);
        }
    }
}