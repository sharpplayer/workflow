import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import moment, { Moment } from 'moment';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MatMomentDateModule } from '@angular/material-moment-adapter';

import { MachineInput } from '../../../core/services/config.service';
import { CreateScheduledJobPart, JobService, SchedulableJobPart } from '../../../core/services/job.service';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { UK_DATE_FORMATS } from '../admin-phase-param/admin-phase-param.component';

export interface RestTimesInput {
  times: string;
}

interface RestPeriod {
  id: string;
  name: string;
  start: number;
  end: number;
  collapsed: boolean;
  collapsible: boolean;
}

interface TimeRange {
  start: number;
  end: number;
}

interface ScheduledJob extends SchedulableJobPart {
  uid: string;
  machineId: number;
  startMinute: number;
  endMinute: number;
  topPx: number;
  heightPx: number;
  isInvalidSequence: boolean;
  resetAppliedMinutes: number;
  effectiveDuration: number;
}

interface DragState {
  uid: string;
  machineId: number;
  startY: number;
  originalVisibleMinute: number;
}

interface ResolvedScheduleDay {
  date: Moment;
  dateLabel: string;
  shortLabel: string;
  reason: string;
  isExceptional: boolean;
  isOverride: boolean;
}

@Component({
  selector: 'app-admin-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatMomentDateModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: MAT_DATE_FORMATS, useValue: UK_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } },
  ],
  styleUrl: './admin-schedule.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--machine-count]': 'machines().length || 1',
  },
  template: `
    <div class="admin-schedule">
      <div
        class="schedule-day-banner"
        [class.exceptional]="resolvedScheduleDay().isExceptional"
        role="status"
        aria-live="polite"
      >
        <div class="schedule-day-banner__copy">
          <div class="schedule-day-banner__eyebrow">
            {{ resolvedScheduleDay().shortLabel }}
          </div>

          <div class="schedule-day-banner__main">
            {{ resolvedScheduleDay().dateLabel }}
          </div>

          <div class="schedule-day-banner__reason">
            {{ resolvedScheduleDay().reason }}
          </div>
        </div>

        <div class="schedule-day-banner__actions">
          @if (selectedScheduleDateSig()) {
            <button
              type="button"
              (click)="resetScheduleDate()"
            >
              Use recommended day
            </button>
          }
          <mat-form-field appearance="fill" class="schedule-date-field">
            <input
              matInput
              [matDatepicker]="picker"
              [value]="selectedScheduleDateSig()"
              (dateChange)="onScheduleDateChange($event.value)"
              placeholder="Select schedule date"
            />
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

        </div>
      </div>

      <div class="schedule-header">
        <div class="time-column header-cell">Time / Breaks</div>

        @for (entry of machineEntries(); track trackMachine($index, entry)) {
          <div class="machine-column header-cell">
            {{ entry.machine.name }}
          </div>
        }
      </div>

      <div class="schedule-body" [style.height.px]="dayHeightPx()">
        <div class="time-column body-cell time-gutter">
          @for (hour of visibleHourMarks(); track hour.minute) {
            <div class="hour-marker" [style.top.px]="hour.topPx">
              <span>{{ hour.label }}</span>
            </div>
          }

          @for (period of restPeriods(); track period.id) {
            @if (period.collapsed) {
              <div
                class="rest-marker"
                [style.top.px]="collapsedMarkerTopPx(period)"
              >
                <button
                  type="button"
                  class="rest-toggle"
                  (click)="toggleRestCollapsed(period.id)"
                  [attr.aria-label]="'Expand ' + period.name"
                >
                  ▸
                </button>
                <span class="rest-marker-label">
                  {{ period.name }}
                </span>
              </div>
            } @else {
              <div
                class="rest-gutter-block"
                [style.top.px]="clockMinuteToTopPx(period.start, restPeriods())"
                [style.height.px]="visibleDurationPx(period.start, period.end, restPeriods())"
              >
                <button
                  type="button"
                  class="rest-toggle"
                  (click)="toggleRestCollapsed(period.id)"
                  [attr.aria-label]="'Collapse ' + period.name"
                >
                  ▾
                </button>

                <div class="rest-gutter-copy">
                  <div class="rest-gutter-name">{{ period.name }}</div>
                  <div class="rest-gutter-time">
                    {{ formatMinute(period.start) }} - {{ formatMinute(period.end) }}
                  </div>
                </div>
              </div>
            }
          }
        </div>

        @for (entry of machineEntries(); track trackMachine($index, entry)) {
          <div class="machine-column body-cell machine-lane">
            @for (hour of visibleHourMarks(); track hour.minute) {
              <div class="hour-line" [style.top.px]="hour.topPx"></div>
            }

            @for (period of restPeriods(); track period.id) {
              @if (!period.collapsed) {
                <div
                  class="rest-block"
                  [style.top.px]="clockMinuteToTopPx(period.start, restPeriods())"
                  [style.height.px]="visibleDurationPx(period.start, period.end, restPeriods())"
                >
                  <span>
                    {{ period.name }} · {{ formatMinute(period.start) }} - {{ formatMinute(period.end) }}
                  </span>
                </div>
              } @else {
                <div
                  class="rest-line"
                  [style.top.px]="clockMinuteToTopPx(period.start, restPeriods())"
                ></div>
              }
            }

            @for (job of entry.jobs; track trackJob($index, job)) {
              <div
                class="job-card"
                [class.invalid-sequence]="job.isInvalidSequence"
                [class.dragging]="dragStateSig()?.uid === job.uid"
                [class.has-reset]="job.resetAppliedMinutes > 0"
                [class.related-job]="isRelatedJob(job)"
                [class.selected-job]="isSelectedJob(job)"
                [style.top.px]="job.topPx"
                [style.height.px]="job.heightPx"
                (mousedown)="startDrag($event, job)"
                (click)="selectJob(job)"
              >
                @if (job.resetAppliedMinutes > 0) {
                  <div
                    class="reset-strip"
                    [style.height.px]="job.resetAppliedMinutes * pixelsPerMinute"
                  ></div>
                }

                <div class="job-content">
                  <div class="job-title one-line">
                    {{ jobRef(job.jobNumber) }} - {{ job.partNo }} of {{ job.jobParts }}
                    (Step {{ job.stepNumber }} of {{ job.steps }})
                    <span class="job-dims">
                      {{ job.length }}x{{ job.width }}x{{ job.thickness }}
                    </span>
                  </div>

                  <div class="job-copy one-line">
                    Job {{ job.timeOnMachine }} min
                    <span class="job-sep">·</span>
                    Reset {{ job.resetAppliedMinutes }} min
                  </div>

                  <div class="job-copy subtle one-line">
                    {{ formatMinute(job.startMinute) }} - {{ formatMinute(job.endMinute) }}
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
<div class="schedule-actions">
  <div class="schedule-actions__messages">
    @if (hasInvalidJobs()) {
      <div class="schedule-actions__warning">
        Fix {{ invalidJobCount() }} invalid job {{ invalidJobCount() === 1 ? 'part' : 'parts' }} before submitting.
      </div>
    }

    @if (submitErrorSig()) {
      <div class="schedule-actions__error">
        {{ submitErrorSig() }}
      </div>
    }

    @if (submitSuccessSig()) {
      <div class="schedule-actions__success">
        {{ submitSuccessSig() }}
      </div>
    }
  </div>

  <button
    type="button"
    [disabled]="hasInvalidJobs() || submittingSig()"
    (click)="submitSchedule()"
  >
    {{ submittingSig() ? 'Submitting...' : 'Submit schedule' }}
  </button>
</div>

  `,
})
export class AdminScheduleComponent {
  readonly machines = input.required<MachineInput[]>();
  readonly jobs = input.required<SchedulableJobPart[]>();
  readonly restTimes = input.required<RestTimesInput>();
  readonly jobService = inject(JobService);

  readonly pixelsPerMinute = 2;
  readonly minutesInDay = 24 * 60;
  readonly useLengthForVisualHeight = false;
  readonly dragSelectThresholdPx = 4;

  readonly dragStateSig = signal<DragState | null>(null);
  readonly selectedJobNumberSig = signal<number | null>(null);
  readonly dragMovedSig = signal(false);

  readonly selectedScheduleDateSig = signal<Moment | null>(null);

  private readonly draggedJobsByMachineSig = signal<Record<number, ScheduledJob[]> | null>(null);
  private readonly overriddenJobsByMachineSig = signal<Record<number, ScheduledJob[]> | null>(null);
  private readonly restCollapsedOverrideSig = signal<Record<string, boolean>>({});

  readonly recommendedScheduleDate = computed(() => this.resolveRecommendedScheduleDate());

  readonly submittingSig = signal(false);
  readonly submitErrorSig = signal<string | null>(null);
  readonly submitSuccessSig = signal<string | null>(null);
  readonly hasInvalidJobs = computed(() =>
    Object.values(this.jobsByMachine())
      .flat()
      .some(job => job.isInvalidSequence)
  );

  readonly invalidJobCount = computed(() =>
    Object.values(this.jobsByMachine())
      .flat()
      .filter(job => job.isInvalidSequence).length
  );


  readonly resolvedScheduleDay = computed<ResolvedScheduleDay>(() => {
    const selected = this.selectedScheduleDateSig();
    const recommended = this.recommendedScheduleDate();
    const effective = selected ?? recommended;
    const isOverride = !!selected;

    return {
      date: effective,
      dateLabel: this.formatDateLong(effective),
      shortLabel: isOverride ? 'Designing schedule for selected day' : 'Designing schedule for',
      reason: isOverride
        ? this.buildSelectedDayReason(effective, recommended)
        : this.buildRecommendedDayReason(recommended),
      isExceptional: isOverride ? this.isExceptionalDay(effective, recommended) : this.isExceptionalRecommendedDay(recommended),
      isOverride,
    };
  });

  private readonly parsedRestPeriods = computed(() =>
    this.parseRestPeriods(this.restTimes()?.times ?? '')
  );

  readonly restPeriods = computed(() => {
    const overrides = this.restCollapsedOverrideSig();
    return this.parsedRestPeriods().map(period => ({
      ...period,
      collapsed: overrides[period.id] ?? period.collapsed,
    }));
  });

  readonly logicalRestRanges = computed<TimeRange[]>(() =>
    this.restPeriods().map(p => ({
      start: p.start,
      end: p.end,
    }))
  );

  readonly dayHeightPx = computed(() =>
    this.clockMinuteToTopPx(this.minutesInDay, this.restPeriods())
  );

  readonly visibleHourMarks = computed(() => {
    const periods = this.restPeriods();
    return Array.from({ length: 25 }, (_, i) => ({
      minute: i * 60,
      label: `${i.toString().padStart(2, '0')}:00`,
      topPx: this.clockMinuteToTopPx(i * 60, periods),
    }));
  });

  readonly baseJobsByMachine = computed(() =>
    this.buildInitialScheduleMap(
      this.machines() ?? [],
      this.jobs() ?? [],
      this.logicalRestRanges(),
      this.restPeriods()
    )
  );

  readonly jobsByMachine = computed(() => {
    const periods = this.restPeriods();
    const dragged = this.draggedJobsByMachineSig();
    if (dragged) return this.withVisuals(dragged, periods);

    const overridden = this.overriddenJobsByMachineSig();
    if (overridden) return this.withVisuals(overridden, periods);

    return this.baseJobsByMachine();
  });

  readonly machineEntries = computed(() =>
    this.machines().map(machine => ({
      machine,
      jobs: this.jobsByMachine()[machine.id] ?? [],
    }))
  );

  onScheduleDateChange(date: Moment | null): void {
    this.selectedScheduleDateSig.set(date ? date.clone().startOf('day') : null);
  }

  resetScheduleDate(): void {
    this.selectedScheduleDateSig.set(null);
  }

  private buildRecommendedDayReason(date: Moment): string {
    if (this.isSaturday(date)) {
      return 'Saturday is the next working day for this schedule.';
    }

    return 'Automatically set to the next working day.';
  }

  private buildSelectedDayReason(selected: Moment, recommended: Moment): string {
    if (selected.isSame(recommended, 'day')) {
      return 'Selected date matches the recommended working day.';
    }

    if (this.isSaturday(selected)) {
      return 'Selected Saturday override.';
    }

    if (this.isSunday(selected)) {
      return 'Selected Sunday override.';
    }

    return 'Manual date override.';
  }

  private isExceptionalRecommendedDay(date: Moment): boolean {
    return this.isSaturday(date) || this.isSunday(date);
  }

  private isExceptionalDay(selected: Moment, recommended: Moment): boolean {
    return !selected.isSame(recommended, 'day') || this.isSaturday(selected) || this.isSunday(selected);
  }

  private isSaturday(date: Moment): boolean {
    return date.day() === 6;
  }

  private isSunday(date: Moment): boolean {
    return date.day() === 0;
  }

  private formatDateLong(date: Moment): string {
    return date.format('dddd, D MMMM YYYY');
  }

  jobRef(jobNumber: number) {
    return this.jobService.getJobRef(jobNumber);
  }

  selectJob(job: ScheduledJob): void {
    if (this.dragMovedSig()) return;
    this.selectedJobNumberSig.set(job.jobNumber);
  }

  isSelectedJob(job: ScheduledJob): boolean {
    return this.selectedJobNumberSig() === job.jobNumber;
  }

  isRelatedJob(job: ScheduledJob): boolean {
    const selected = this.selectedJobNumberSig();
    return selected !== null && selected === job.jobNumber;
  }

  toggleRestCollapsed(id: string): void {
    this.restCollapsedOverrideSig.update(current => {
      const periods = this.restPeriods();
      const match = periods.find(p => p.id === id);
      if (!match || !match.collapsible) return current;

      return {
        ...current,
        [id]: !match.collapsed,
      };
    });
  }

  collapsedMarkerTopPx(period: RestPeriod): number {
    const y = this.clockMinuteToTopPx(period.start, this.restPeriods());
    const markerHeight = 24;
    const maxTop = Math.max(0, this.dayHeightPx() - markerHeight);
    return Math.max(0, Math.min(y - markerHeight / 2, maxTop));
  }

  startDrag(event: MouseEvent, job: ScheduledJob): void {
    event.preventDefault();
    event.stopPropagation();

    const current = this.jobsByMachine();
    const cloned: Record<number, ScheduledJob[]> = {};

    for (const [machineId, jobs] of Object.entries(current)) {
      cloned[+machineId] = jobs.map(j => ({ ...j }));
    }

    this.draggedJobsByMachineSig.set(cloned);
    this.dragMovedSig.set(false);

    this.dragStateSig.set({
      uid: job.uid,
      machineId: job.machineId,
      startY: event.clientY,
      originalVisibleMinute: this.getVisibleMinutesUntil(job.startMinute, this.restPeriods()),
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onMove(event: MouseEvent): void {
    const drag = this.dragStateSig();
    const snapshot = this.draggedJobsByMachineSig();
    if (!drag || !snapshot) return;

    const delta = event.clientY - drag.startY;
    if (Math.abs(delta) > this.dragSelectThresholdPx) {
      this.dragMovedSig.set(true);
    }

    const list = [...(snapshot[drag.machineId] ?? [])];
    const idx = list.findIndex(j => j.uid === drag.uid);
    if (idx === -1) return;

    const job = { ...list[idx] };
    const periods = this.restPeriods();
    const logicalRanges = this.logicalRestRanges();

    const nextVisibleMinute = Math.max(
      0,
      Math.round(drag.originalVisibleMinute + delta / this.pixelsPerMinute)
    );

    const rawStartMinute = this.visibleMinuteToClockMinute(nextVisibleMinute, periods);
    const startMinute = this.adjustStart(rawStartMinute, logicalRanges);

    const previewLane = [...list].map(j => ({ ...j }));
    previewLane[idx] = { ...job, startMinute };
    const sortedPreviewLane = this.sortLaneJobs(previewLane, drag.uid);

    const previewIndex = sortedPreviewLane.findIndex(j => j.uid === job.uid);
    const previousJobOnMachine = previewIndex > 0 ? sortedPreviewLane[previewIndex - 1] : null;

    const durationInfo = this.getEffectiveDuration(job, previousJobOnMachine, drag.machineId);
    const endMinute = this.computeEnd(startMinute, durationInfo.effectiveDuration, logicalRanges);

    job.startMinute = startMinute;
    job.endMinute = endMinute;
    job.resetAppliedMinutes = durationInfo.resetAppliedMinutes;
    job.effectiveDuration = durationInfo.effectiveDuration;
    this.applyVisualMetrics(job, periods);

    list[idx] = job;
    snapshot[drag.machineId] = list;

    this.draggedJobsByMachineSig.set({ ...snapshot });
  }

  @HostListener('document:mouseup')
  onUp(): void {
    const drag = this.dragStateSig();
    const snapshot = this.draggedJobsByMachineSig();

    if (drag && snapshot) {
      const updated = this.insertAndCascadeLane(snapshot, drag.machineId, drag.uid);
      this.overriddenJobsByMachineSig.set(updated);
      this.draggedJobsByMachineSig.set(null);
    } else {
      this.draggedJobsByMachineSig.set(null);
    }

    this.dragStateSig.set(null);

    queueMicrotask(() => {
      this.dragMovedSig.set(false);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.job-card')) {
      this.selectedJobNumberSig.set(null);
    }
  }

  private resolveRecommendedScheduleDate(): Moment {
    let candidate = moment().startOf('day').add(1, 'day');

    while (candidate.day() === 0) {
      candidate = candidate.clone().add(1, 'day');
    }

    return candidate;
  }

  private buildInitialScheduleMap(
    machines: MachineInput[],
    jobs: SchedulableJobPart[],
    logicalRanges: TimeRange[],
    periods: RestPeriod[]
  ): Record<number, ScheduledJob[]> {
    const map: Record<number, ScheduledJob[]> = {};
    const firstStart = logicalRanges.length ? logicalRanges[0].end : 0;
    const cursor = new Map<number, number>();

    for (const m of machines) {
      const reset = Number.isFinite(m.setupTime) ? m.setupTime : 0;
      const start = Math.max(firstStart, reset);
      cursor.set(m.id, this.adjustStart(this.clampMinute(start), logicalRanges));
      map[m.id] = [];
    }

    jobs.forEach((job, i) => {
      const machineId = job.machineId;
      if (!cursor.has(machineId)) return;

      const previousJobOnMachine = map[machineId].length
        ? map[machineId][map[machineId].length - 1]
        : null;

      const durationInfo = this.getEffectiveDuration(job, previousJobOnMachine, machineId);
      const start = this.adjustStart(cursor.get(machineId)!, logicalRanges);
      const end = this.computeEnd(start, durationInfo.effectiveDuration, logicalRanges);

      const scheduled: ScheduledJob = {
        ...job,
        uid: `${job.jobPartId}-${i}`,
        machineId,
        startMinute: start,
        endMinute: end,
        topPx: 0,
        heightPx: 0,
        isInvalidSequence: false,
        resetAppliedMinutes: durationInfo.resetAppliedMinutes,
        effectiveDuration: durationInfo.effectiveDuration,
      };

      this.applyVisualMetrics(scheduled, periods);
      map[machineId].push(scheduled);
      cursor.set(machineId, end);
    });

    this.validateSequenceMap(map);
    return map;
  }

  private insertAndCascadeLane(
    snapshot: Record<number, ScheduledJob[]>,
    machineId: number,
    draggedUid: string
  ): Record<number, ScheduledJob[]> {
    const periods = this.restPeriods();
    const logicalRanges = this.logicalRestRanges();
    const lane = [...(snapshot[machineId] ?? [])].map(j => ({ ...j }));

    const draggedIndex = lane.findIndex(j => j.uid === draggedUid);
    if (draggedIndex === -1) return { ...snapshot };

    const sortedLane = this.sortLaneJobs(lane, draggedUid);

    for (let i = 0; i < sortedLane.length; i++) {
      const prev = i > 0 ? sortedLane[i - 1] : null;
      const curr = sortedLane[i];

      const desiredStart = this.adjustStart(curr.startMinute, logicalRanges);
      const minStart = prev ? this.adjustStart(prev.endMinute, logicalRanges) : desiredStart;
      const nextStart = prev ? Math.max(desiredStart, minStart) : desiredStart;

      const durationInfo = this.getEffectiveDuration(curr, prev, machineId);

      curr.startMinute = nextStart;
      curr.endMinute = this.computeEnd(curr.startMinute, durationInfo.effectiveDuration, logicalRanges);
      curr.resetAppliedMinutes = durationInfo.resetAppliedMinutes;
      curr.effectiveDuration = durationInfo.effectiveDuration;
      this.applyVisualMetrics(curr, periods);
    }

    snapshot[machineId] = sortedLane;
    this.validateSequenceMap(snapshot);

    return { ...snapshot };
  }

  private sortLaneJobs(jobs: ScheduledJob[], priorityUid?: string): ScheduledJob[] {
    return [...jobs].sort((a, b) => {
      if (a.startMinute !== b.startMinute) {
        return a.startMinute - b.startMinute;
      }

      if (priorityUid) {
        if (a.uid === priorityUid && b.uid !== priorityUid) return -1;
        if (b.uid === priorityUid && a.uid !== priorityUid) return 1;
      }

      if (a.stepNumber !== b.stepNumber) {
        return a.stepNumber - b.stepNumber;
      }

      return a.uid.localeCompare(b.uid);
    });
  }

  private withVisuals(
    map: Record<number, ScheduledJob[]>,
    periods: RestPeriod[]
  ): Record<number, ScheduledJob[]> {
    const clone: Record<number, ScheduledJob[]> = {};

    for (const [machineId, jobs] of Object.entries(map)) {
      clone[+machineId] = jobs.map(job => {
        const copy = { ...job };
        this.applyVisualMetrics(copy, periods);
        return copy;
      });
    }

    return clone;
  }

  private applyVisualMetrics(job: ScheduledJob, periods: RestPeriod[]): void {
    job.topPx = this.clockMinuteToTopPx(job.startMinute, periods);
    job.heightPx = Math.max(12, this.visibleDurationPx(job.startMinute, job.endMinute, periods));
  }

  private validateSequenceMap(map: Record<number, ScheduledJob[]>): void {
    const all = Object.values(map).flat();
    const grouped = new Map<number, ScheduledJob[]>();

    for (const j of all) {
      j.isInvalidSequence = false;
      const list = grouped.get(j.jobPartId) ?? [];
      list.push(j);
      grouped.set(j.jobPartId, list);
    }

    grouped.forEach(list => {
      list.sort((a, b) => a.stepNumber - b.stepNumber);

      for (let i = 1; i < list.length; i++) {
        if (list[i].startMinute < list[i - 1].endMinute) {
          list[i].isInvalidSequence = true;
          list[i - 1].isInvalidSequence = true;
        }
      }
    });
  }

  private getMachineResetTime(machineId: number): number {
    const machine = this.machines().find(m => m.id === machineId);
    return machine?.setupTime ?? 0;
  }

  private hasDimensionChange(
    previous: SchedulableJobPart | ScheduledJob,
    current: SchedulableJobPart | ScheduledJob
  ): boolean {
    return (
      previous.width !== current.width ||
      previous.length !== current.length ||
      previous.thickness !== current.thickness
    );
  }

  private getEffectiveDuration(
    job: SchedulableJobPart | ScheduledJob,
    previousJobOnMachine: SchedulableJobPart | ScheduledJob | null,
    machineId: number
  ): { effectiveDuration: number; resetAppliedMinutes: number } {
    const baseDuration = this.useLengthForVisualHeight ? job.length : job.timeOnMachine;

    if (!previousJobOnMachine) {
      return {
        effectiveDuration: baseDuration,
        resetAppliedMinutes: 0,
      };
    }

    const needsReset = this.hasDimensionChange(previousJobOnMachine, job);
    const resetAppliedMinutes = needsReset ? this.getMachineResetTime(machineId) : 0;

    return {
      effectiveDuration: baseDuration + resetAppliedMinutes,
      resetAppliedMinutes,
    };
  }

  private adjustStart(start: number, ranges: TimeRange[]): number {
    let t = this.clampMinute(start);
    let guard = 0;

    while (guard++ < 1000) {
      if (t >= this.minutesInDay) return this.minutesInDay;

      const activeRest = ranges.find(r => t >= r.start && t < r.end);
      if (!activeRest) return t;

      t = activeRest.end;
    }

    return this.minutesInDay;
  }

  private computeEnd(start: number, duration: number, ranges: TimeRange[]): number {
    let t = this.adjustStart(start, ranges);
    let remaining = Math.max(0, duration);
    let guard = 0;

    while (remaining > 0 && guard++ < 5000) {
      if (t >= this.minutesInDay) return this.minutesInDay;

      const activeRest = ranges.find(r => t >= r.start && t < r.end);
      if (activeRest) {
        t = activeRest.end;
        continue;
      }

      const nextRest = ranges.find(r => r.start > t);

      if (!nextRest) {
        return this.clampMinute(t + remaining);
      }

      const workable = nextRest.start - t;

      if (workable >= remaining) {
        return this.clampMinute(t + remaining);
      }

      remaining -= workable;
      t = nextRest.end;
    }

    return this.minutesInDay;
  }

  private parseRestPeriods(value: string): RestPeriod[] {
    const pattern = /^(.*?):(\d{2}:\d{2})-(\d{2}:\d{2})$/;

    return value
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map((part, index): RestPeriod | null => {
        const match = part.match(pattern);
        if (!match) return null;

        const [, nameRaw, startText, endText] = match;
        const name = nameRaw.trim();
        const start = this.toMin(startText);
        const end = this.toMin(endText);

        if (
          !name ||
          !Number.isFinite(start) ||
          !Number.isFinite(end) ||
          start < 0 ||
          end < 0 ||
          start >= end ||
          start > this.minutesInDay ||
          end > this.minutesInDay
        ) {
          return null;
        }

        return {
          id: `rest-${index}`,
          name,
          start,
          end,
          collapsed: true,
          collapsible: true,
        };
      })
      .filter((p): p is RestPeriod => p !== null)
      .sort((a, b) => a.start - b.start);
  }

  private getVisibleMinutesUntil(minute: number, periods: RestPeriod[]): number {
    const clamped = this.clampMinute(minute);
    let visible = clamped;

    for (const period of periods) {
      if (!period.collapsed) continue;
      if (period.start >= clamped) continue;

      const overlap = Math.min(clamped, period.end) - period.start;
      if (overlap > 0) visible -= overlap;
    }

    return Math.max(0, visible);
  }

  private getVisibleDuration(start: number, end: number, periods: RestPeriod[]): number {
    const s = this.clampMinute(start);
    const e = this.clampMinute(end);
    if (e <= s) return 0;

    return this.getVisibleMinutesUntil(e, periods) - this.getVisibleMinutesUntil(s, periods);
  }

  clockMinuteToTopPx(minute: number, periods: RestPeriod[]): number {
    return this.getVisibleMinutesUntil(minute, periods) * this.pixelsPerMinute;
  }

  visibleDurationPx(start: number, end: number, periods: RestPeriod[]): number {
    return this.getVisibleDuration(start, end, periods) * this.pixelsPerMinute;
  }

  private visibleMinuteToClockMinute(visibleMinute: number, periods: RestPeriod[]): number {
    const target = Math.max(0, visibleMinute);
    let visibleCursor = 0;
    let clockCursor = 0;

    for (const period of periods) {
      const workBlock = Math.max(0, period.start - clockCursor);

      if (visibleCursor + workBlock >= target) {
        return this.clampMinute(clockCursor + (target - visibleCursor));
      }

      visibleCursor += workBlock;
      clockCursor = period.end;

      if (!period.collapsed) {
        const visibleRest = period.end - period.start;

        if (visibleCursor + visibleRest >= target) {
          return this.clampMinute(period.start + (target - visibleCursor));
        }

        visibleCursor += visibleRest;
      }
    }

    return this.clampMinute(clockCursor + (target - visibleCursor));
  }

  private toMin(t: string): number {
    const [h, m] = (t ?? '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  }

  private clampMinute(v: number): number {
    return Math.max(0, Math.min(v, this.minutesInDay));
  }

  formatMinute(m: number): string {
    const clamped = this.clampMinute(m);
    const h = Math.floor(clamped / 60);
    const mm = clamped % 60;
    return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  }

  trackMachine = (_: number, e: { machine: MachineInput }) => e.machine.id;
  trackJob = (_: number, j: ScheduledJob) => j.uid;

  async submitSchedule(): Promise<void> {
    if (this.hasInvalidJobs() || this.submittingSig()) {
      return;
    }

    this.submittingSig.set(true);
    this.submitErrorSig.set(null);
    this.submitSuccessSig.set(null);

    try {
      const scheduledDate = this.resolvedScheduleDay().date.format('YYYY-MM-DD');

      const jobParts: CreateScheduledJobPart[] = Object.values(this.jobsByMachine())
        .flat()
        .map((job, index) => {
          const plannedStartAt = this.toPlannedDateTime(scheduledDate, job.startMinute);
          const plannedFinishAt = this.toPlannedDateTime(scheduledDate, job.endMinute);

          return {
            jobId: job.jobId,
            jobPartId: job.jobPartId,
            machineId: job.machineId,
            stepNumber: job.stepNumber,
            quantity: job.quantity,
            setupMinutes: job.resetAppliedMinutes,
            plannedMinutes: job.timeOnMachine,
            plannedStartAt,
            plannedFinishAt,
            scheduledDate,
            position: index + 1,
            productId: job.productId,
          };
        });

      await this.jobService.submitSchedule(jobParts);

      this.submitSuccessSig.set('Schedule submitted.');
    } catch (error) {
      console.error('Failed to submit schedule', error);
      this.submitErrorSig.set('Failed to submit schedule.');
    } finally {
      this.submittingSig.set(false);
    }
  }

  private toPlannedDateTime(scheduledDate: string, minuteOfDay: number): string {
    return moment(scheduledDate)
      .startOf('day')
      .add(minuteOfDay, 'minutes')
      .toISOString();
  }

}

