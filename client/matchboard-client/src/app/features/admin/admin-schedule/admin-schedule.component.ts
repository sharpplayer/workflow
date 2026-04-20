import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MachineInput {
  machineId: number;
  machineName: string;
  resetTime: number;
}

export interface JobInput {
  jobPartId: number;
  requiredMachine: number;
  stepNumber: number;
  timeOnMachine: number;
  width: number;
  length: number;
  thickness: number;
}

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

interface ScheduledJob extends JobInput {
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

@Component({
  selector: 'app-admin-schedule',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './admin-schedule.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--machine-count]': 'machines().length || 1',
  },
  template: `
    <div class="admin-schedule">
      <div class="schedule-header">
        <div class="time-column header-cell">Time / Breaks</div>

        @for (entry of machineEntries(); track trackMachine($index, entry)) {
          <div class="machine-column header-cell">
            {{ entry.machine.machineName }}
          </div>
        }
      </div>

      <div class="schedule-body" [style.height.px]="dayHeightPx()">
        <div class="time-column body-cell time-gutter">
          @for (hour of visibleHourMarks(); track hour.minute) {
            <div
              class="hour-marker"
              [style.top.px]="hour.topPx"
            >
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
              <div
                class="hour-line"
                [style.top.px]="hour.topPx"
              ></div>
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
                [style.top.px]="job.topPx"
                [style.height.px]="job.heightPx"
                (mousedown)="startDrag($event, job)"
                >

                <!-- RESET STRIP -->
                @if (job.resetAppliedMinutes > 0) {
                    <div
                    class="reset-strip"
                    [style.height.px]="job.resetAppliedMinutes * pixelsPerMinute"
                    ></div>
                }

                <!-- CONTENT -->
                <div class="job-content">

                    <div class="job-title one-line">
                    {{ job.jobPartId }}/{{ job.stepNumber }}
                    <span class="job-dims">
                        {{ job.length }}×{{ job.width }}×{{ job.thickness }}
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
  `,
})
export class AdminScheduleComponent {
  readonly machines = input.required<MachineInput[]>();
  readonly jobs = input.required<JobInput[]>();
  readonly restTimes = input.required<RestTimesInput>();

  readonly pixelsPerMinute = 2;
  readonly minutesInDay = 24 * 60;
  readonly useLengthForVisualHeight = false;

  readonly dragStateSig = signal<DragState | null>(null);
  private readonly draggedJobsByMachineSig = signal<Record<number, ScheduledJob[]> | null>(null);
  private readonly overriddenJobsByMachineSig = signal<Record<number, ScheduledJob[]> | null>(null);
  private readonly restCollapsedOverrideSig = signal<Record<string, boolean>>({});

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
      jobs: this.jobsByMachine()[machine.machineId] ?? [],
    }))
  );

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

    const current = this.jobsByMachine();
    const cloned: Record<number, ScheduledJob[]> = {};

    for (const [machineId, jobs] of Object.entries(current)) {
      cloned[+machineId] = jobs.map(j => ({ ...j }));
    }

    this.draggedJobsByMachineSig.set(cloned);

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

    const list = [...(snapshot[drag.machineId] ?? [])];
    const idx = list.findIndex(j => j.uid === drag.uid);
    if (idx === -1) return;

    const job = { ...list[idx] };
    const periods = this.restPeriods();
    const logicalRanges = this.logicalRestRanges();

    const delta = event.clientY - drag.startY;
    const nextVisibleMinute = Math.max(
      0,
      Math.round(drag.originalVisibleMinute + delta / this.pixelsPerMinute)
    );

    const rawStartMinute = this.visibleMinuteToClockMinute(nextVisibleMinute, periods);
    const startMinute = this.adjustStart(rawStartMinute, logicalRanges);

    const previewLane = [...list].map(j => ({ ...j }));
    previewLane[idx] = { ...job, startMinute };
    previewLane.sort((a, b) => {
      if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
      return a.stepNumber - b.stepNumber;
    });

    const previewIndex = previewLane.findIndex(j => j.uid === job.uid);
    const previousJobOnMachine = previewIndex > 0 ? previewLane[previewIndex - 1] : null;

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
      const updated = this.insertAndCascadeLane(
        snapshot,
        drag.machineId,
        drag.uid
      );

      this.overriddenJobsByMachineSig.set(updated);
      this.draggedJobsByMachineSig.set(null);
    } else {
      this.draggedJobsByMachineSig.set(null);
    }

    this.dragStateSig.set(null);
  }

  private buildInitialScheduleMap(
    machines: MachineInput[],
    jobs: JobInput[],
    logicalRanges: TimeRange[],
    periods: RestPeriod[]
  ): Record<number, ScheduledJob[]> {
    const map: Record<number, ScheduledJob[]> = {};
    const firstStart = logicalRanges.length ? logicalRanges[0].end : 0;
    const cursor = new Map<number, number>();

    for (const m of machines) {
      const reset = Number.isFinite(m.resetTime) ? m.resetTime : 0;
      const start = Math.max(firstStart, reset);
      cursor.set(m.machineId, this.adjustStart(this.clampMinute(start), logicalRanges));
      map[m.machineId] = [];
    }

    jobs.forEach((job, i) => {
      const machineId = job.requiredMachine;
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

    lane.sort((a, b) => {
      if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
      return a.stepNumber - b.stepNumber;
    });

    for (let i = 0; i < lane.length; i++) {
      const prev = i > 0 ? lane[i - 1] : null;
      const curr = lane[i];

      const desiredStart = this.adjustStart(curr.startMinute, logicalRanges);
      const minStart = prev ? this.adjustStart(prev.endMinute, logicalRanges) : desiredStart;
      const nextStart = prev ? Math.max(desiredStart, minStart) : desiredStart;

      const durationInfo = this.getEffectiveDuration(curr, prev, machineId);

      curr.startMinute = nextStart;
      curr.endMinute = this.computeEnd(
        curr.startMinute,
        durationInfo.effectiveDuration,
        logicalRanges
      );
      curr.resetAppliedMinutes = durationInfo.resetAppliedMinutes;
      curr.effectiveDuration = durationInfo.effectiveDuration;
      this.applyVisualMetrics(curr, periods);
    }

    snapshot[machineId] = lane;
    this.validateSequenceMap(snapshot);

    return { ...snapshot };
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
    job.heightPx = Math.max(
      12,
      this.visibleDurationPx(job.startMinute, job.endMinute, periods)
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

  private getMachineResetTime(machineId: number): number {
    const machine = this.machines().find(m => m.machineId === machineId);
    return machine?.resetTime ?? 0;
  }

  private hasDimensionChange(
    previous: JobInput | ScheduledJob,
    current: JobInput | ScheduledJob
  ): boolean {
    return (
      previous.width !== current.width ||
      previous.length !== current.length ||
      previous.thickness !== current.thickness
    );
  }

  private getEffectiveDuration(
    job: JobInput | ScheduledJob,
    previousJobOnMachine: JobInput | ScheduledJob | null,
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

  trackMachine = (_: number, e: { machine: MachineInput }) => e.machine.machineId;
  trackJob = (_: number, j: ScheduledJob) => j.uid;
}