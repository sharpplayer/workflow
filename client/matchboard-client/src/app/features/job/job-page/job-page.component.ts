import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { JobComponent } from '../job/job.component';
import { PhaseListComponent } from '../phase-list/phase-list.component';
import { JobService, JobWithOnePart, ScheduledJobPhase } from '../../../core/services/job.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-job-page',
  standalone: true,
  imports: [JobComponent, PhaseListComponent],
  template: `
    @if (role()) {
      <div class="full-screen-center">
        @if (!currentJob()) {
          <div class="schedule-page-header">
            <button type="button" (click)="logout()">Log Out</button>
          </div>

          <phase-list
            [role]="role()"
            (phaseSelected)="openScheduledPhase($event)"
          ></phase-list>
        } @else {
          <job
            [job]="currentJob()!"
            (schedule)="showPhaseList()"
            (jobUpdated)="onJobUpdated($event)">
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
  private readonly authService = inject(AuthService);

  readonly role = signal<string>(history.state?.role ?? '');
  readonly username = signal<string>(history.state?.username ?? '');
  readonly currentJob = signal<JobWithOnePart | null>(null);

  constructor() {
    if (!this.role()) {
      void this.router.navigate(['/login']);
    }
  }

  async logout(): Promise<void> {
    await this.authService.logoutAll();
  }

  async openScheduledPhase(phase: ScheduledJobPhase): Promise<void> {
    const job = await this.jobService.getJobWithOnePart(
      phase.jobId,
      phase.jobPartId,
      phase.jobPartPhaseId
    );

    this.currentJob.set(job);
  }

  showPhaseList(): void {
    this.currentJob.set(null);
  }

  onJobUpdated(job: JobWithOnePart): void {
    if (job.completedPhase != null) {
      this.showPhaseList();
      return;
    }

    this.currentJob.set(job);
  }
}
