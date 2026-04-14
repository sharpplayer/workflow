import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { JobComponent } from '../job/job.component';
import { PhaseListComponent } from '../phase-list/phase-list.component';
import { JobService, JobWithOnePart } from '../../../core/services/job.service';

@Component({
  selector: 'app-job-page',
  standalone: true,
  imports: [JobComponent, PhaseListComponent],
  template: `
    @if (role()) {
      <div class="full-screen-center">
        @if (!currentJob()) {
          <phase-list [role]="role()"></phase-list>
          <div>
            <button (click)="nextJob()">Next</button>
          </div>
        } @else {
          <job
            [job]="currentJob()"
            (schedule)="showPhaseList()">
          </job>
        }
      </div>
    } @else {
      <p>Missing role.</p>
    }
  `,
  styleUrl: './job-page.component.css'
})
export class JobPageComponent {
  private readonly router = inject(Router);
  private readonly jobService = inject(JobService);

  readonly role = signal<string>(history.state?.role ?? '');
  readonly currentJob = signal<JobWithOnePart | null>(null);

  constructor() {
    if (!this.role()) {
      void this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  async nextJob(): Promise<void> {
    const job = await this.jobService.nextJob(this.role());
    console.log(job);
    this.currentJob.set(job);
  }

  showPhaseList(): void {
    this.currentJob.set(null);
  }
}