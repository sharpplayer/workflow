import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { JobComponent } from '../job/job.component';
import { PhaseListComponent } from '../phase-list/phase-list.component';
import { JobService } from '../../../core/services/job.service';

@Component({
  selector: 'app-job-page',
  standalone: true,
  imports: [JobComponent, PhaseListComponent],
  template: `
    @if (role()) {
      <div class="full-screen-center">
        <div>
            <button (click)="logout()">Log Out</button>
        </div>
        <phase-list [role]="role()"></phase-list>
        <div>
            <button (click)="nextJob()">Next</button>
        </div>
      </div>
    } @else {
      <p>Missing role.</p>
    }
  `,
  styleUrl: './job-page.component.css'
})
export class JobPageComponent {
  private readonly router = inject(Router);
  private jobService = inject(JobService)
  readonly role = signal<string>(history.state?.role ?? '');

  constructor() {
    if (!this.role()) {
      // fallback if someone lands directly on /job
      void this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  async nextJob() {
    let p = await this.jobService.nextJob(this.role());
    console.log(p);
  }
}