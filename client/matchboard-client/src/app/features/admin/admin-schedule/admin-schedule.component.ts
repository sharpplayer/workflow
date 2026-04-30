import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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

interface RestPeriodVisual extends RestPeriod {
  topPx: number;
  heightPx: number;
  markerTopPx: number;
  timeLabel: string;
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

  setupMinutes: number;
  plannedMinutes: number;
  packMinutes: number;
  breakMinutes: number;

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

interface MachineEntry {
  machine: MachineInput;
  jobs: ScheduledJob[];
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
    MatMomentDateModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: MAT_DATE_FORMATS, useValue: UK_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } },
  ],
  styleUrl: './admin-schedule.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--machine-count]': 'machineEntries().length || 1',
  },
  template: `
    @let restVisuals = restPeriodVisuals();
    @let hours = visibleHourMarks();
    @let entries = machineEntries();
    @let dayHeight = dayHeightPx();
    @let dragOverIndex = machineDragOverIndexSig();

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
            <button type="button" (click)="resetScheduleDate()">
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

        @for (entry of entries; track trackMachine($index, entry)) {
          <div
            class="machine-column header-cell"
            draggable="true"
            [class.machine-column--dragging]="machineColumnDragIdSig() === entry.machine.id"
            [class.machine-column--drop-before]="dragOverIndex === $index"
            [class.machine-column--drop-after]="dragOverIndex === $index + 1"
            (dragstart)="onMachineColumnDragStart($event, entry.machine.id)"
            (dragover)="onMachineColumnDragOver($event, $index)"
            (drop)="onMachineColumnDrop($event)"
            (dragend)="onMachineColumnDragEnd()"
          >
            {{ entry.machine.name }}
          </div>
        }
      </div>

      <div class="schedule-body" [style.height.px]="dayHeight">
        <div class="time-column body-cell time-gutter">
          @for (hour of hours; track hour.minute) {
            <div class="hour-marker" [style.top.px]="hour.topPx">
              <span>{{ hour.label }}</span>
            </div>
          }

          @for (period of restVisuals; track period.id) {
            @if (period.collapsed) {
              <div class="rest-marker" [style.top.px]="period.markerTopPx">
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
                [style.top.px]="period.topPx"
                [style.height.px]="period.heightPx"
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
                    {{ period.timeLabel }}
                  </div>
                </div>
              </div>
            }
          }
        </div>

        @for (entry of entries; track trackMachine($index, entry)) {
          <div
            class="machine-column body-cell machine-lane"
            [class.machine-column--drop-before]="dragOverIndex === $index"
            [class.machine-column--drop-after]="dragOverIndex === $index + 1"
            (dragover)="onMachineColumnDragOver($event, $index)"
            (drop)="onMachineColumnDrop($event)"
          >
            @for (hour of hours; track hour.minute) {
              <div class="hour-line" [style.top.px]="hour.topPx"></div>
            }

            @for (period of restVisuals; track period.id) {
              @if (!period.collapsed) {
                <div
                  class="rest-block"
                  [style.top.px]="period.topPx"
                  [style.height.px]="period.heightPx"
                >
                  <span>{{ period.name }} · {{ period.timeLabel }}</span>
                </div>
              } @else {
                <div class="rest-line" [style.top.px]="period.topPx"></div>
              }
            }

            @for (job of entry.jobs; track trackJob($index, job)) {
              <div
                class="job-card"
                [class.invalid-sequence]="job.isInvalidSequence"
                [class.dragging]="dragStateSig()?.uid === job.uid"
                [class.has-reset]="job.setupMinutes > 0"
                [class.related-job]="isRelatedJob(job)"
                [class.selected-job]="isSelectedJob(job)"
                [style.top.px]="job.topPx"
                [style.height.px]="job.heightPx"
                (mousedown)="startDrag($event, job)"
                (click)="selectJob(job)"
              >
                @if (job.setupMinutes > 0) {
                  <div
                    class="reset-strip"
                    [style.height.px]="job.setupMinutes * pixelsPerMinute"
                  ></div>
                }

                <div class="job-content">
                  <div class="job-title one-line">
                    {{ jobRef(job.jobNumber) }} - {{ job.partNo }} of {{ job.jobParts }}
                    (Step {{ job.stepNumber }} of {{ job.steps }})
                    <span class="job-dims">
                      {{ job.length }}x{{ job.width }}x{{ job.thickness }}
                    </span>
                    Quantity {{ job.quantity }}
                  </div>

                  <div class="job-copy one-line">
                    Setup {{ job.setupMinutes }} min
                    <span class="job-sep">·</span>
                    Job {{ job.plannedMinutes }} min
                    <span class="job-sep">·</span>
                    QC {{ job.packMinutes }} min
                    <span class="job-sep">·</span>
                    Break {{ job.breakMinutes }} min
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

  private readonly machineOrderStorageKey = 'admin-schedule-machine-order-v1';

  readonly dragStateSig = signal<DragState | null>(null);
  readonly selectedJobNumberSig = signal<number | null>(null);
  readonly dragMovedSig = signal(false);
  readonly selectedScheduleDateSig = signal<Moment | null>(null);

  readonly machineColumnDragIdSig = signal<number | null>(null);
  readonly machineDragOverIndexSig = signal<number | null>(null);

  private readonly preferredMachineOrderSig = signal<number[]>(this.loadPreferredMachineOrder());
  private readonly draggedJobsByMachineSig = signal<Record<number, ScheduledJob[]> | null>(null);
  private readonly overriddenJobsByMachineSig = signal<Record<number, ScheduledJob[]> | null>(null);
  private readonly restCollapsedOverrideSig = signal<Record<string, boolean>>({});

  readonly recommendedScheduleDate = computed(() => this.resolveRecommendedScheduleDate());

  readonly submittingSig = signal(false);
  readonly submitErrorSig = signal<string | null>(null);
  readonly submitSuccessSig = signal<string | null>(null);

  readonly jobsByMachine = computed(() => {
    const periods = this.restPeriods();
    const dragged = this.draggedJobsByMachineSig();

    if (dragged) {
      return this.withVisuals(dragged, periods);
    }

    const overridden = this.overriddenJobsByMachineSig();

    if (overridden) {
      return this.withVisuals(overridden, periods);
    }

    return this.baseJobsByMachine();
  });

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
      isExceptional: isOverride
        ? this.isExceptionalDay(effective, recommended)
        : this.isExceptionalRecommendedDay(recommended),
      isOverride,
    };
  });

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  private readonly parsedRestPeriods = computed(() => {
    const value = this.restTimes()?.times ?? '';
    return this.parseRestPeriods(value);
  });

  readonly restPeriods = computed(() => {
    const overrides = this.restCollapsedOverrideSig();
    const parsed = this.parsedRestPeriods();

    return parsed.map(period => ({
      ...period,
      collapsed: overrides[period.id] ?? period.collapsed,
    }));
  });

  readonly restPeriodVisuals = computed<RestPeriodVisual[]>(() => {
    const periods = this.restPeriods();

    return periods.map(period => {
      const topPx = this.clockMinuteToTopPx(period.start, periods);
      const heightPx = this.visibleDurationPx(period.start, period.end, periods);

      return {
        ...period,
        topPx,
        heightPx,
        markerTopPx: this.getCollapsedMarkerTopPx(period, periods),
        timeLabel: `${this.formatMinute(period.start)} - ${this.formatMinute(period.end)}`,
      };
    });
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

  readonly usedMachineIds = computed(() => {
    const ids = new Set<number>();

    for (const job of this.jobs() ?? []) {
      ids.add(job.machineId);
    }

    return ids;
  });

  readonly visibleMachines = computed(() => {
    const usedIds = this.usedMachineIds();
    const preferredOrder = this.getResolvedPreferredMachineOrder();

    return (this.machines() ?? [])
      .filter(machine => usedIds.has(machine.id))
      .sort((a, b) => {
        const ai = preferredOrder.indexOf(a.id);
        const bi = preferredOrder.indexOf(b.id);

        return ai - bi;
      });
  });

  readonly baseJobsByMachine = computed(() => {
    const visibleMachines = this.visibleMachines();
    const jobs = this.jobs() ?? [];
    const logicalRestRanges = this.logicalRestRanges();
    const restPeriods = this.restPeriods();

    return this.buildInitialScheduleMap(
      visibleMachines,
      jobs,
      logicalRestRanges,
      restPeriods
    );
  });

  readonly machineEntries = computed<MachineEntry[]>(() => {
    const visibleMachines = this.visibleMachines();
    const jobsByMachine = this.jobsByMachine();

    return visibleMachines.map(machine => ({
      machine,
      jobs: jobsByMachine[machine.id] ?? [],
    }));
  });

  onMachineColumnDragStart(event: DragEvent, machineId: number): void {
    this.machineColumnDragIdSig.set(machineId);
    this.machineDragOverIndexSig.set(null);

    event.dataTransfer?.setData('text/plain', String(machineId));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onMachineColumnDragOver(event: DragEvent, visibleIndex: number): void {
    const draggedMachineId = this.machineColumnDragIdSig();

    if (draggedMachineId === null) return;

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const target = event.currentTarget as HTMLElement | null;
    const rect = target?.getBoundingClientRect();
    const midpoint = rect ? rect.left + rect.width / 2 : 0;
    const dropIndex = event.clientX < midpoint ? visibleIndex : visibleIndex + 1;

    this.machineDragOverIndexSig.set(dropIndex);
  }

  onMachineColumnDrop(event: DragEvent): void {
    event.preventDefault();

    const draggedMachineId = this.machineColumnDragIdSig();
    const dropIndex = this.machineDragOverIndexSig();

    if (draggedMachineId === null || dropIndex === null) {
      this.onMachineColumnDragEnd();
      return;
    }

    this.applyMachineColumnReorder(draggedMachineId, dropIndex);
    this.onMachineColumnDragEnd();
  }

  onMachineColumnDragEnd(): void {
    this.machineColumnDragIdSig.set(null);
    this.machineDragOverIndexSig.set(null);
  }

  private applyMachineColumnReorder(draggedMachineId: number, dropIndex: number): void {
    const visibleBeforeMove = this.visibleMachines().map(machine => machine.id);
    const preferredWithoutDragged = this
      .getResolvedPreferredMachineOrder()
      .filter(id => id !== draggedMachineId);

    const visibleWithoutDragged = visibleBeforeMove.filter(id => id !== draggedMachineId);
    const boundedDropIndex = Math.max(0, Math.min(dropIndex, visibleWithoutDragged.length));

    let nextOrder: number[];

    if (boundedDropIndex === 0) {
      nextOrder = [draggedMachineId, ...preferredWithoutDragged];
    } else {
      const previousVisibleId = visibleWithoutDragged[boundedDropIndex - 1];
      const previousIndexInPreferred = preferredWithoutDragged.indexOf(previousVisibleId);

      if (previousIndexInPreferred === -1) {
        nextOrder = [...preferredWithoutDragged, draggedMachineId];
      } else {
        nextOrder = [
          ...preferredWithoutDragged.slice(0, previousIndexInPreferred + 1),
          draggedMachineId,
          ...preferredWithoutDragged.slice(previousIndexInPreferred + 1),
        ];
      }
    }

    this.setPreferredMachineOrder(this.dedupeMachineOrder(nextOrder));
  }

  private getResolvedPreferredMachineOrder(): number[] {
    const knownMachineIds = (this.machines() ?? []).map(machine => machine.id);
    const preferred = this.preferredMachineOrderSig().filter(id => knownMachineIds.includes(id));
    const missing = knownMachineIds.filter(id => !preferred.includes(id));

    return [...preferred, ...missing];
  }

  private setPreferredMachineOrder(order: number[]): void {
    this.preferredMachineOrderSig.set(order);
    this.savePreferredMachineOrder(order);
  }

  private loadPreferredMachineOrder(): number[] {
    try {
      if (typeof localStorage === 'undefined') return [];

      const raw = localStorage.getItem(this.machineOrderStorageKey);
      if (!raw) return [];

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed.filter((id): id is number => Number.isInteger(id))
        : [];
    } catch {
      return [];
    }
  }

  private savePreferredMachineOrder(order: number[]): void {
    try {
      if (typeof localStorage === 'undefined') return;

      localStorage.setItem(this.machineOrderStorageKey, JSON.stringify(order));
    } catch {
      // Ignore storage failures.
    }
  }

  private dedupeMachineOrder(order: number[]): number[] {
    return [...new Set(order)];
  }

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

  jobRef(jobNumber: number): string {
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
    return this.getCollapsedMarkerTopPx(period, this.restPeriods());
  }

  private getCollapsedMarkerTopPx(period: RestPeriod, periods: RestPeriod[]): number {
    const y = this.clockMinuteToTopPx(period.start, periods);
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
    job.setupMinutes = durationInfo.setupMinutes;
    job.effectiveDuration = durationInfo.effectiveDuration;

    this.applyDurationMetrics(job);
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

    for (const machine of machines) {
      cursor.set(machine.id, this.adjustStart(this.clampMinute(firstStart), logicalRanges));
      map[machine.id] = [];
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

        setupMinutes: durationInfo.setupMinutes,
        plannedMinutes: this.getPlannedMinutes(job),
        packMinutes: this.getPackMinutes(job),
        breakMinutes: 0,

        effectiveDuration: durationInfo.effectiveDuration,
      };

      this.applyDurationMetrics(scheduled);
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
      curr.setupMinutes = durationInfo.setupMinutes;
      curr.effectiveDuration = durationInfo.effectiveDuration;

      this.applyDurationMetrics(curr);
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

        this.applyDurationMetrics(copy);
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

  private applyDurationMetrics(job: ScheduledJob): void {
    job.plannedMinutes = this.getPlannedMinutes(job);
    job.packMinutes = this.getPackMinutes(job);
    job.breakMinutes = this.getBreakMinutes(
      job.startMinute,
      job.endMinute,
      job.effectiveDuration
    );
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

  private getMachineSetupTime(machineId: number): number {
    const machine = this.machines().find(m => m.id === machineId);
    return machine?.setupTimeSeconds ?? 0;
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

  private secondsToWholeMinutes(seconds: number): number {
    return Math.ceil((seconds ?? 0) / 60);
  }

  private getPlannedMinutes(job: SchedulableJobPart | ScheduledJob): number {
    return this.secondsToWholeMinutes(job.timeOnMachineSeconds);
  }

  private getPackMinutes(job: SchedulableJobPart | ScheduledJob): number {
    return this.secondsToWholeMinutes(job.timeForPacksSeconds);
  }

  private getBreakMinutes(
    startMinute: number,
    endMinute: number,
    nonBreakMinutes: number
  ): number {
    return Math.max(0, (endMinute - startMinute) - nonBreakMinutes);
  }

  private getEffectiveDuration(
    job: SchedulableJobPart | ScheduledJob,
    previousJobOnMachine: SchedulableJobPart | ScheduledJob | null,
    machineId: number
  ): { effectiveDuration: number; setupMinutes: number } {
    const plannedMinutes = this.useLengthForVisualHeight
      ? job.length
      : this.getPlannedMinutes(job);

    const packMinutes = this.getPackMinutes(job);

    if (!previousJobOnMachine) {
      const setupMinutes = this.secondsToWholeMinutes(this.getMachineSetupTime(machineId));

      return {
        effectiveDuration: setupMinutes + plannedMinutes + packMinutes,
        setupMinutes,
      };
    }

    const needsSetup = this.hasDimensionChange(previousJobOnMachine, job);
    const setupMinutes = needsSetup
      ? this.secondsToWholeMinutes(this.getMachineSetupTime(machineId))
      : 0;

    return {
      effectiveDuration: setupMinutes + plannedMinutes + packMinutes,
      setupMinutes,
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

  trackMachine = (_: number, e: MachineEntry) => e.machine.id;
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
            setupMinutes: job.setupMinutes,
            plannedMinutes: job.plannedMinutes,
            breakMinutes: job.breakMinutes,
            packMinutes: job.packMinutes,
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
