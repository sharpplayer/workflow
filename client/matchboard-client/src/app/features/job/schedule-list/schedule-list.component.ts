import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  input,
  LOCALE_ID
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MatMomentDateModule,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS
} from '@angular/material-moment-adapter';

import moment, { Moment } from 'moment';

import {
  JobService,
  JobStatus,
  JobStatusLabel,
  ScheduledJobPartView,
  JobPartParam,
  ParamStatus
} from '../../../core/services/job.service';
import {
  ConfigService,
  MachineInput
} from '../../../core/services/config.service';
import { UK_DATE_FORMATS } from '../../admin/admin-phase-param/admin-phase-param.component';
import { JobPhaseParamComponent } from '../job-phase-param/job-phase-param.component';
import { DeviceService } from '../../../core/services/device.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'schedule-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatMomentDateModule,
    JobPhaseParamComponent
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'en-GB' },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: MAT_DATE_FORMATS, useValue: UK_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } }
  ],
  template: `
    <div class="schedule-list-container">
      <!-- existing controls -->

      <table>
        <thead>
          <tr>
            <th>Due Date</th>
            <th>Job Ref</th>
            <th>Part</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Material</th>
            <th>Orientation</th>
            <th>Dimensions</th>
            <th>Thickness</th>
            <th>Setup (mins)</th>
            <th>Planned Start</th>
            <th>Break</th>
            <th>Planned End</th>
            <th>Actual Start</th>
            <th>Actual End</th>
            <th>Variance</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          @if (loading()) {
            <tr>
              <td colspan="17" class="no-data">Loading...</td>
            </tr>
          } @else if (jobs().length === 0) {
            <tr>
              <td colspan="17" class="no-data">No schedule</td>
            </tr>
          } @else {
            @for (job of jobs(); track trackJob($index, job)) {
              <tr>
                <td>
                  <span class="due-date-badge" [ngClass]="getDueClass(job.dueDate)">
                    {{ formatUkDate(job.dueDate) }}
                  </span>
                </td>

                <td>{{ getJobRef(job.jobNumber) }}</td>
                <td>{{ job.partNumber }} of {{ job.jobParts }}</td>
                <td>{{ job.productName }}</td>
                <td>{{ job.quantity }}</td>
                <td>{{ job.material }}</td>

                <td>
                  <span
                    class="orientation-badge"
                    [class.orientation-portrait]="isPortrait(job)"
                    [class.orientation-landscape]="!isPortrait(job)"
                  >
                    {{ isPortrait(job) ? 'PORTRAIT' : 'LANDSCAPE' }}
                  </span>
                </td>

                <td>{{ job.length }} x {{ job.width }}</td>
                <td>{{ job.thickness }}</td>
                <td>{{ job.setupMinutes }}</td>
                <td>{{ formatPlannedStart(job.plannedStart) }}</td>
                <td>{{ formatBreak(job) }}</td>
                <td>{{ formatTime(job.plannedFinish) }}</td>

                <td>
                  @if (job.actualStart) {
                    {{ formatTime(job.actualStart) }}
                  } @else {
                    <job-phase-param
                      [param]="buildSignoffParam(job.actualStartParamId)"
                      [currentValue]="''"
                      [disabled]="loading()"
                      (signoffRequested)="onActualStartSignoff(job, $event)"
                    />
                  }
                </td>

                <td>
                  @if (job.actualFinish) {
                    {{ formatTime(job.actualFinish) }}
                  } @else {
                    <job-phase-param
                      [param]="buildSignoffParam(job.actualFinishParamId)"
                      [currentValue]="''"
                      [disabled]="loading()"
                      (signoffRequested)="onActualFinishSignoff(job, $event)"
                    />
                  }
                </td>

                <td>
                  @if (hasVariance(job)) {
                    <span
                      class="variance-badge"
                      [class.variance-positive]="getVarianceMinutes(job)! >= 0"
                      [class.variance-negative]="getVarianceMinutes(job)! < 0"
                    >
                      {{ formatVariance(job) }}
                    </span>
                  }
                </td>

                <td>{{ getStatus(job.status) }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './schedule-list.component.css'
})
export class ScheduleListComponent implements OnInit, OnChanges {
  machineId = input<number | null>(null);

  private deviceService = inject(DeviceService);
  private jobService = inject(JobService);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);

  machines = signal<MachineInput[]>([]);
  jobs = signal<ScheduledJobPartView[]>([]);

  selectedMachineId = signal<number | null>(null);
  selectedDate = signal<Moment | null>(null);

  loading = signal(false);
  error = signal('');

  buildSignoffParam(partParamId: number): JobPartParam {
    return {
      partParamId,
      partPhaseId: 0,
      phaseId: 0,
      phaseNumber: 0,
      input: 3,
      name: 'sign',
      value: null,
      valuedAt: null,
      config: 'SIGN(' + this.deviceService.getStatus().users[0].role + ')',
      status: ParamStatus.INITIALISED
    };
  }

  async onActualStartSignoff(
    job: ScheduledJobPartView,
    event: { param: JobPartParam; username?: string; role?: string }
  ): Promise<void> {
    try {
      const loginResult = await this.authService.open({
        username: event.username,
        role: event.role
      });

      if (!loginResult) {
        return;
      }

      await this.jobService.signOff(loginResult, {
        [event.param.partParamId]: loginResult.username
      });

      await this.loadSchedule();
    } catch (err) {
      console.error(err);
      this.error.set(
        err instanceof Error ? err.message : 'Failed to sign off actual start.'
      );
    }
  }

  async onActualFinishSignoff(
    job: ScheduledJobPartView,
    event: { param: JobPartParam; username?: string; role?: string }
  ): Promise<void> {
    try {
      const loginResult = await this.authService.open({
        username: event.username,
        role: event.role
      });

      if (!loginResult) {
        return;
      }

      await this.jobService.signOff(loginResult, {
        [event.param.partParamId]: loginResult.username
      });

      await this.loadSchedule();
    } catch (err) {
      console.error(err);
      this.error.set(
        err instanceof Error ? err.message : 'Failed to sign off actual finish.'
      );
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.hasMachineIdInput()) {
      await this.loadSchedule();
      return;
    }

    await this.loadMachines();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if ('machineId' in changes && !changes['machineId'].firstChange) {
      if (this.hasMachineIdInput()) {
        await this.loadSchedule();
      }
    }
  }

  hasMachineIdInput(): boolean {
    return this.machineId() != null;
  }

  async loadMachines(): Promise<void> {
    try {
      const machines = await this.configService.getMachineList();

      const sorted = machines.sort((a, b) =>
        a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' })
      );

      this.machines.set(sorted);
    } catch (err) {
      console.error(err);
      this.error.set('Failed to load machines.');
    }
  }

  onMachineChange(machineId: number | null): void {
    this.selectedMachineId.set(machineId);
    void this.loadSchedule();
  }

  onDateChange(date: Moment | null): void {
    this.selectedDate.set(date);
    void this.loadSchedule();
  }

  async loadSchedule(): Promise<void> {
    this.error.set('');

    const machineId = this.machineId() ?? this.selectedMachineId();

    if (machineId == null) {
      this.jobs.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);

    try {
      const date = this.buildDateString();
      const jobs = await this.jobService.getJobsForMachine(
        machineId,
        date
      );

      this.jobs.set(jobs);
    } catch (err) {
      console.error(err);
      this.error.set('Failed to load schedule.');
      this.jobs.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private buildDateString(): string {
    const date = this.selectedDate() ?? moment();
    return date.format(UK_DATE_FORMATS.storage);
  }

  formatUkDate(value: string | null): string {
    if (!value) return '';
    const parsed = moment.parseZone(value);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : value;
  }

  formatTime(value: string | null): string {
    if (!value) return '';
    const parsed = moment.parseZone(value);
    return parsed.isValid() ? parsed.format('HH:mm') : '';
  }

  getDueClass(value: string | null): string {
    if (!value) return '';

    const date = moment.parseZone(value).startOf('day');
    const today = moment().startOf('day');

    if (date.isBefore(today)) return 'due-past';
    if (date.isSame(today)) return 'due-today';
    return 'due-future';
  }

  isPortrait(job: ScheduledJobPartView): boolean {
    return job.length > job.width;
  }

  hasVariance(job: ScheduledJobPartView): boolean {
    return !!job.plannedFinish && !!job.actualFinish;
  }

  getVarianceMinutes(job: ScheduledJobPartView): number | null {
    if (!job.plannedFinish || !job.actualFinish) return null;

    const planned = moment.parseZone(job.plannedFinish);
    const actual = moment.parseZone(job.actualFinish);

    if (!planned.isValid() || !actual.isValid()) return null;

    return planned.diff(actual, 'minutes');
  }

  formatVariance(job: ScheduledJobPartView): string {
    const mins = this.getVarianceMinutes(job);
    if (mins == null) return '';

    const sign = mins >= 0 ? '+' : '-';
    const abs = Math.abs(mins);

    const h = Math.floor(abs / 60);
    const m = abs % 60;

    return `${sign}${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}`;
  }

  trackJob(index: number, job: ScheduledJobPartView): string {
    return `${job.jobNumber}-${job.partNumber}-${index}`;
  }

  getStatus(status: JobStatus): string {
    return JobStatusLabel[status];
  }

  getJobRef(jobNumber: number): string {
    return this.jobService.getJobRef(jobNumber);
  }

  getBreakMinutes(job: ScheduledJobPartView): number | null {
    if (!job.plannedStart || !job.plannedFinish) return null;

    const plannedStart = moment.parseZone(job.plannedStart);
    const plannedFinish = moment.parseZone(job.plannedFinish);

    if (!plannedStart.isValid() || !plannedFinish.isValid()) return null;

    const totalScheduledMinutes = plannedFinish.diff(plannedStart, 'minutes');
    return totalScheduledMinutes - job.plannedMinutes;
  }

  formatBreak(job: ScheduledJobPartView): string {
    const mins = this.getBreakMinutes(job);
    if (mins == null) return '';

    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  formatPlannedStart(value: string | null): string {
    if (!value) return '';

    const planned = moment.parseZone(value);
    if (!planned.isValid()) return '';

    const selected = this.selectedDate();
    if (!selected) {
      return planned.format('HH:mm');
    }

    const selectedStart = selected.clone().startOf('day');
    const plannedStart = planned.clone().startOf('day');

    const dayDiff = plannedStart.diff(selectedStart, 'days');
    const time = planned.format('HH:mm');

    if (dayDiff < 0) {
      return `${time} (${dayDiff} Day${Math.abs(dayDiff) > 1 ? 's' : ''})`;
    }

    return time;
  }
}