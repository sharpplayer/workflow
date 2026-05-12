import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobService, ScheduleView } from '../../../core/services/job.service';

@Component({
  selector: 'admin-schedule-list',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  template: `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Machine</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="2" class="status-row">Loading schedule...</td>
          </tr>
        } @else if (schedules().length === 0) {
          <tr>
            <td colspan="2" class="status-row">No schedules found.</td>
          </tr>
        } @else {
          @for (schedule of schedules(); track schedule.date + '-' + schedule.machineId) {
            <tr>
              <td>
                <a [routerLink]="['/admin/schedule', schedule.date]">
                  {{ schedule.date | date: 'dd/MM/yyyy' }}
                </a>
              </td>
              <td>
                <a
                  [routerLink]="['/admin/schedule', schedule.date, 'machine', schedule.machineId]"
                  [queryParams]="{ machine: schedule.machine }"
                >
                  {{ schedule.machine }}
                </a>
              </td>
            </tr>
          }
        }
      </tbody>
    </table>

    @if (errorMessage()) {
      <p class="error">{{ errorMessage() }}</p>
    }

    <div class="pager">
      <a
        href=""
        (click)="previousPage($event)"
        [class.disabled]="!canGoPrevious() || loading()"
        [attr.aria-disabled]="!canGoPrevious() || loading()"
      >
        Previous
      </a>

      <span class="page-info">
        Showing {{ schedules().length }} schedule line{{ schedules().length === 1 ? '' : 's' }}
      </span>

      <a
        href=""
        (click)="nextPage($event)"
        [class.disabled]="!canGoNext() || loading()"
        [attr.aria-disabled]="!canGoNext() || loading()"
      >
        Next
      </a>
    </div>
  `,
  styleUrl: './admin-schedule-list.component.css'
})
export class AdminScheduleListComponent implements OnInit {
  private readonly jobService = inject(JobService);

  readonly pageSize = 50;

  schedules = signal<ScheduleView[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  canGoPrevious = signal(false);
  canGoNext = signal(false);

  private currentToDate: string | null = null;
  private previousCursors: Array<string | null> = [];

  async ngOnInit(): Promise<void> {
    await this.loadPage(null);
  }

  async nextPage(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.canGoNext() || this.loading() || this.schedules().length === 0) {
      return;
    }

    const oldestDate = this.schedules()[this.schedules().length - 1].date;
    const nextToDate = this.addDays(oldestDate, -1);

    this.previousCursors.push(this.currentToDate);
    await this.loadPage(nextToDate);
  }

  async previousPage(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.canGoPrevious() || this.loading()) {
      return;
    }

    const previousToDate = this.previousCursors.pop() ?? null;
    await this.loadPage(previousToDate);
  }

  private async loadPage(toDate: string | null): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const schedules = await this.jobService.getSchedules(null, toDate, this.pageSize);
      this.schedules.set(schedules ?? []);
      this.currentToDate = toDate;
      this.canGoPrevious.set(this.previousCursors.length > 0);
      this.canGoNext.set((schedules?.length ?? 0) > 0);
    } catch (error) {
      console.error('Failed to load schedules', error);
      this.schedules.set([]);
      this.errorMessage.set('Failed to load schedules.');
      this.canGoNext.set(false);
      this.canGoPrevious.set(this.previousCursors.length > 0);
    } finally {
      this.loading.set(false);
    }
  }

  private addDays(date: string, days: number): string {
    const parsed = new Date(`${date}T00:00:00`);
    parsed.setDate(parsed.getDate() + days);
    return parsed.toISOString().slice(0, 10);
  }
}
