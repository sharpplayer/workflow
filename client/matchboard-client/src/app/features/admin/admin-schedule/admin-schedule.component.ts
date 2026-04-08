import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    JobService,
    JobStatusLabel,
    SchedulableJobPart,
    SchedulableJobParts
} from '../../../core/services/job.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';

type JobPartRow = SchedulableJobPart & {
    selected: boolean;
};

type TableColumn = {
    key: string;
    header: string;
};

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
                (ngModelChange)="onScheduleDateChange($event)"
                [disabled]="loadingDates() || loadingJobParts() || scheduling()"
            >
                @for (date of scheduleDates(); track date.key) {
                    <option [value]="date.key">
                        {{ date.value }}
                    </option>
                }
            </select>
        </div>

        @if (errorMessage()) {
            <div>
                {{ errorMessage() }}
            </div>
        }

        @if (loadingJobParts()) {
            <div>
                Loading job parts...
            </div>
        }

            <div>
                <table>
                    <thead>
                        <tr>
                            @if (!isUnscheduled()) {
                                <th>
                                    <input
                                        type="checkbox"
                                        [checked]="allSelected()"
                                        [indeterminate]="someSelected() && !allSelected()"
                                        (change)="toggleSelectAll($any($event.target).checked)"
                                    />
                                </th>
                            }

                            @for (column of tableColumns; track column.key) {
                                <th>{{ column.header }}</th>
                            }
                        </tr>
                    </thead>

                    <tbody>
                        @if (jobParts().length > 0) {
                            @for (part of jobParts(); track part.jobPartId) {
                                <tr>
                                    @if (!isUnscheduled()) {
                                        <td>
                                            <input
                                                type="checkbox"
                                                [ngModel]="part.selected"
                                                (ngModelChange)="toggleRowSelection(part.jobPartId, $event)"
                                                [disabled]="scheduling()"
                                            />
                                        </td>
                                    }

                                    @for (column of tableColumns; track column.key) {
                                        <td>{{ getColumnValue(part, column.key) }}</td>
                                    }
                                </tr>
                            }
                        } @else if (!loadingJobParts() && hasLoadedJobParts()) {
                            <tr>
                                <td [attr.colspan]="tableColumns.length">
                                No job parts found.
                                </td>
                            </tr>
                        }   
                        </tbody>
                </table>

                @if (!isUnscheduled()) {
                    <div>
                        <button
                            type="button"
                            (click)="scheduleSelected()"
                            [disabled]="!canSchedule()"
                        >
                            {{ scheduling() ? 'Scheduling...' : 'Schedule' }}
                        </button>
                    </div>
                }
            </div>
        
    `,
    styleUrl: './admin-schedule.component.css'
})
export class AdminScheduleComponent implements OnInit {
    private readonly jobService = inject(JobService);
    private readonly configService = inject(ConfigService);

    readonly unscheduledLabel = '(Unscheduled)';

    readonly tableColumns: TableColumn[] = [
        { key: 'jobNumber', header: 'Job Number' },
        { key: 'partSummary', header: 'Part Number' },
        { key: 'product', header: 'Product Name' },
        { key: 'oldName', header: 'Sage Name' },
        { key: 'quantity', header: 'Quantity' },
        { key: 'fromCallOff', header: 'From Call Off' },
        { key: 'jobPartStatus', header: 'Job Part Status' },
        { key: 'order', header: 'Order'}
    ];

    readonly availableDates = signal<ConfigItem[]>([]);
    readonly selectedScheduleDate = signal<string>('');
    readonly jobParts = signal<JobPartRow[]>([]);

    readonly loadingDates = signal(false);
    readonly loadingJobParts = signal(false);
    readonly hasLoadedJobParts = signal(false);
    readonly scheduling = signal(false);
    readonly errorMessage = signal('');

    readonly scheduleDates = computed<ConfigItem[]>(() => [
        { key: '', value: this.unscheduledLabel },
        ...this.availableDates()
    ]);

    readonly isUnscheduled = computed(() => !this.selectedScheduleDate());

    readonly allSelected = computed(() =>
        this.jobParts().length > 0 && this.jobParts().every(part => part.selected)
    );

    readonly someSelected = computed(() =>
        this.jobParts().some(part => part.selected)
    );

    readonly selectedCount = computed(() =>
        this.jobParts().filter(part => part.selected).length
    );

    readonly canSchedule = computed(() =>
        !this.isUnscheduled() &&
        !this.scheduling() &&
        this.selectedCount() > 0
    );

    async ngOnInit(): Promise<void> {
        await this.loadScheduleDates();
        await this.getJobParts();
    }

    async loadScheduleDates(): Promise<void> {
        this.loadingDates.set(true);
        this.errorMessage.set('');

        try {
            const response = await this.configService.getList('schedule-dates');
            this.availableDates.set(response.value ?? []);
            this.selectedScheduleDate.set('');
        } catch (error) {
            console.error('Failed to load schedule dates', error);
            this.errorMessage.set('Failed to load schedule dates.');
        } finally {
            this.loadingDates.set(false);
        }
    }

    async onScheduleDateChange(scheduleDate: string): Promise<void> {
        this.selectedScheduleDate.set(scheduleDate);

        if (!scheduleDate) {
            this.jobParts.update(parts =>
                parts.map(p => ({ ...p, selected: false }))
            );
        }

        await this.getJobParts();
    }

    async getJobParts(): Promise<void> {
        this.loadingJobParts.set(true);
        this.errorMessage.set('');
        this.jobParts.set([]);
        this.hasLoadedJobParts.set(false);

        try {
            const scheduleDate = this.selectedScheduleDate() || null;
            const response: SchedulableJobParts =
                await this.jobService.getJobParts(scheduleDate);

            const rows: JobPartRow[] = (response.schedulable ?? []).map(part => ({
                ...part,
                selected: false
            }));

            this.jobParts.set(rows);
            this.hasLoadedJobParts.set(true);
        } catch (error) {
            console.error('Failed to load job parts', error);
            this.errorMessage.set('Failed to load job parts.');
        } finally {
            this.loadingJobParts.set(false);
        }
    }

    async scheduleSelected(): Promise<void> {
        if (!this.canSchedule()) {
            return;
        }

        this.scheduling.set(true);
        this.errorMessage.set('');

        try {
            const selectedParts = this.getSelectedJobParts();
            await this.jobService.scheduleJobParts(this.selectedScheduleDate(),
                selectedParts.map(part => part.jobPartId));

            await this.getJobParts();
        } catch (error) {
            console.error('Failed to schedule job parts', error);
            this.errorMessage.set('Failed to schedule job parts.');
        } finally {
            this.scheduling.set(false);
        }
    }

    toggleRowSelection(jobPartId: number, selected: boolean): void {
        this.jobParts.update(parts =>
            parts.map(part =>
                part.jobPartId === jobPartId
                    ? { ...part, selected }
                    : part
            )
        );
    }

    toggleSelectAll(selected: boolean): void {
        this.jobParts.update(parts =>
            parts.map(part => ({ ...part, selected }))
        );
    }

    getSelectedJobParts(): JobPartRow[] {
        return this.jobParts().filter(part => part.selected);
    }

    getColumnValue(part: JobPartRow, key: string): string | number {
        switch (key) {
            case 'jobNumber':
                return part.jobNumber;
            case 'partSummary':
                return `${part.partNo} of ${part.jobParts}`;
            case 'product':
                return part.product;
            case 'oldName':
                return part.oldName;
            case 'quantity':
                return part.quantity;
            case 'fromCallOff':
                return part.fromCallOff ? 'YES' : 'NO';
            case 'jobPartStatus':
                return JobStatusLabel[part.partStatus];
            case 'order':
                return part.order || 'Unscheduled';
            default:
                return '';
        }
    }
}