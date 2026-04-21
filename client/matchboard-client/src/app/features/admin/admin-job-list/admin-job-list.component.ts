import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { JobService, JobStatus, JobStatusLabel, JobView } from '../../../core/services/job.service';

@Component({
  selector: 'admin-job-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Job Number</th>
          <th>Parts</th>
          <th>Due</th>
          <th>Customer</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        @if (loading()) {
          <tr>
            <td colspan="6" class="status-row">Loading jobs...</td>
          </tr>
        } @else if (jobs().length === 0) {
          <tr>
            <td colspan="6" class="status-row">No jobs found.</td>
          </tr>
        } @else {
          @for (job of jobs(); track job.id) {
            <tr
              (click)="selectJob(job)"
              [class.selected]="selectedJob()?.id === job.id"
            >
              <td>{{ job.id }}</td>
              <td>{{ job.number }}</td>
              <td>{{ job.parts }}</td>
              <td>{{ job.due | date: 'dd/MM/yyyy' }}</td>
              <td>{{ job.customer }}</td>
              <td>{{ getStatus(job.status) }}</td>
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
        Showing {{ jobs().length }} job{{ jobs().length === 1 ? '' : 's' }}
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
  styleUrl: './admin-job-list.component.css'
})
export class AdminJobListComponent implements OnInit {
  private readonly jobService = inject(JobService);

  readonly pageSize = 50;

  jobs = signal<JobView[]>([]);
  selectedJob = signal<JobView | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  canGoPrevious = signal(false);
  canGoNext = signal(false);

  private currentToNumber: number | null = null;
  private previousCursors: Array<number | null> = [];

  async ngOnInit(): Promise<void> {
    await this.loadPage(null);
  }

  async nextPage(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.canGoNext() || this.loading() || this.jobs().length === 0) {
      return;
    }

    const smallestNumber = this.jobs()[this.jobs().length - 1].number;
    const nextToNumber = smallestNumber - 1;

    this.previousCursors.push(this.currentToNumber);
    await this.loadPage(nextToNumber);
  }

  async previousPage(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.canGoPrevious() || this.loading()) {
      return;
    }

    const previousToNumber = this.previousCursors.pop() ?? null;
    await this.loadPage(previousToNumber);
  }

  selectJob(job: JobView): void {
    this.selectedJob.set(job);
  }

  formatDue(due: Date): string {
    return due.toLocaleString();
  }

  private async loadPage(toNumber: number | null): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const jobs = await this.jobService.getJobs(toNumber, this.pageSize);
      this.jobs.set(jobs ?? []);
      this.currentToNumber = toNumber;
      this.selectedJob.set(null);
      this.canGoPrevious.set(this.previousCursors.length > 0);
      this.canGoNext.set((jobs?.length ?? 0) === this.pageSize);
    } catch (error) {
      console.error('Failed to load jobs', error);
      this.jobs.set([]);
      this.errorMessage.set('Failed to load jobs.');
      this.canGoNext.set(false);
      this.canGoPrevious.set(this.previousCursors.length > 0);
    } finally {
      this.loading.set(false);
    }
  }

  getStatus(status : JobStatus){
    return JobStatusLabel[status];
  }
}