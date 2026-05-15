import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import {
  JobActivityView,
  JobService,
  JobStatus,
  JobStatusLabel
} from '../../../core/services/job.service';

@Component({
  selector: 'admin-job-activity',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="activity-panel" [class.fullscreen]="fullscreen()">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Due</th>
              <th>Job Ref</th>
              <th>Part</th>
              <th>Status</th>
              <th>
                <div class="active-phase-header">
                  <span>Active Phase</span>
                  <button
                    type="button"
                    class="fullscreen-toggle"
                    (click)="toggleFullscreen()"
                    [attr.aria-label]="fullscreen() ? 'Exit full screen' : 'Expand full screen'"
                    [title]="fullscreen() ? 'Exit full screen' : 'Expand full screen'"
                  >
                    <span class="fullscreen-icon" [class.fullscreen-icon--shrink]="fullscreen()"></span>
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="5" class="status-row">Loading activity...</td>
              </tr>
            } @else if (activity().length === 0) {
              <tr>
                <td colspan="5" class="status-row">No active scheduled job parts found.</td>
              </tr>
            } @else {
              @for (item of activity(); track item.operationId) {
                <tr>
              <td>{{ item.dueDate | date: 'dd/MM/yyyy' }}</td>
              <td>{{ getJobRef(item.jobNumber) }}</td>
              <td>{{ item.partNumber }} of {{ item.jobParts }}</td>
              <td>
                <span class="timing-status" [ngClass]="getTimingStatusClass(item)">
                  {{ getTimingStatusLabel(item) }}
                </span>
              </td>
              <td>
                    @if (item.status === JobStatus.COMPLETED) {
                      Complete
                    } @else {
                      {{ item.activePhaseName || 'Not started' }}
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (errorMessage()) {
        <p class="error">{{ errorMessage() }}</p>
      }
    </section>
  `,
  styleUrl: './admin-job-activity.component.css'
})
export class AdminJobActivityComponent implements OnInit {
  protected readonly JobStatus = JobStatus;

  private readonly jobService = inject(JobService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly activity = signal<JobActivityView[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly fullscreen = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadActivity();
  }

  async toggleFullscreen(): Promise<void> {
    if (this.fullscreen()) {
      await this.exitBrowserFullscreen();
      this.fullscreen.set(false);
      return;
    }

    this.fullscreen.set(true);
    await this.requestBrowserFullscreen();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    if (!document.fullscreenElement) {
      this.fullscreen.set(false);
    }
  }

  async loadActivity(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      this.activity.set(await this.jobService.getJobActivity());
    } catch (error) {
      console.error('Failed to load job activity', error);
      this.activity.set([]);
      this.errorMessage.set('Failed to load job activity.');
    } finally {
      this.loading.set(false);
    }
  }

  getStatus(status: JobStatus): string {
    return JobStatusLabel[status];
  }

  getJobRef(jobNumber: number): string {
    return this.jobService.getJobRef(jobNumber);
  }

  getTimingStatusClass(item: JobActivityView): string {
    return `timing-status--${this.getTimingStatus(item)}`;
  }

  getTimingStatusLabel(item: JobActivityView): string {
    switch (this.getTimingStatus(item)) {
      case 'late-finish':
        return 'Late finish';
      case 'late-start':
        return 'Late start';
      case 'waiting':
        return 'Waiting';
      default:
        return 'Active';
    }
  }

  private getTimingStatus(item: JobActivityView): 'late-finish' | 'late-start' | 'waiting' | 'active' {
    const now = Date.now();
    const plannedStart = this.toTime(item.plannedStartAt);
    const plannedFinish = this.toTime(item.plannedFinishAt);

    if (!item.actualFinishAt && plannedFinish !== null && plannedFinish < now) {
      return 'late-finish';
    }

    if (!item.actualStartAt && plannedStart !== null && plannedStart < now) {
      return 'late-start';
    }

    if (plannedStart !== null && plannedStart > now) {
      return 'waiting';
    }

    return 'active';
  }

  private toTime(value: string | null): number | null {
    if (!value) {
      return null;
    }

    const time = new Date(value).getTime();

    return Number.isFinite(time) ? time : null;
  }

  private async requestBrowserFullscreen(): Promise<void> {
    const panel = this.elementRef.nativeElement.querySelector('.activity-panel') as HTMLElement | null;

    try {
      await (panel ?? document.documentElement).requestFullscreen();
    } catch (error) {
      console.warn('Browser fullscreen request failed', error);
    }
  }

  private async exitBrowserFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (error) {
      console.warn('Browser fullscreen exit failed', error);
    }
  }
}
