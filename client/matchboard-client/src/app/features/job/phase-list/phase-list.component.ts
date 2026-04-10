import { Component, effect, inject, input, signal } from '@angular/core';
import { JobService, JobStatus, JobStatusLabel, ScheduledJobPhase } from '../../../core/services/job.service';

@Component({
  selector: 'phase-list',
  standalone: true,
template: `
  <table>
    <colgroup>
      <col style="width: 50px">
      <col style="width: 100px">
      <col style="width: 100px">
      <col style="width: 200px">
      <col style="width: 100px">
      <col style="width: 150px">
      <col style="width: 100px">
      <col style="width: 200px">
      <col style="width: 100px">
    </colgroup>
    <thead>
      <tr>
        <th></th>
        <th>Job Number</th>
        <th>Part</th>
        <th>Product</th>
        <th>Quantity</th>
        <th>Phase</th>
        <th>Phase Number</th>
        <th>Special Instruction</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      @if (phases().length > 0) {
        @for (phase of phases(); track phase.jobPartId; let i = $index) {
          <tr>
            <td>{{ i + 1 }}</td>
            <td>{{ phase.jobNumber }}</td>
            <td>{{ phase.partNumber }} of {{ phase.jobParts }}</td>
            <td class="nowrap">
              {{ phase.name }} ({{ phase.oldName }})
            </td>
            <td>{{ phase.quantity }}</td>
            <td>{{ phase.phaseDescription }}</td>
            <td>{{ phase.phaseNumber }}</td>
            <td>{{ phase.specialInstruction }}</td>
            <td>{{ statusLabel(phase.phaseStatus) }}</td>
          </tr>
        }
      } @else {
        <tr>
          <td colspan="9">
            No scheduled phases found.
          </td>
        </tr>
      }
    </tbody>
  </table>
  `,
  styleUrl : './phase-list.component.css'
})
export class PhaseListComponent {
  readonly role = input.required<string>();
  readonly date = input<string | null>(null);

  private readonly jobService = inject(JobService);

  phases = signal<ScheduledJobPhase[]>([]);

  constructor() {
    effect(async () => {
      const result = await this.jobService.getJobScheduledPhases(
        this.date(),
        this.role()
      );

      this.phases.set(result.scheduled ?? []);
    });
  }

  statusLabel(status : JobStatus){
    return JobStatusLabel[status];
  }
}