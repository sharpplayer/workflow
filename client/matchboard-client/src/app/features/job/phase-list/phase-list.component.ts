import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
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
      @if (showRequiredByColumn()) {
        <col style="width: 110px">
      }
    </colgroup>
    <thead>
      <tr>
        <th></th>
        <th>Job Ref</th>
        <th>Part</th>
        <th>Product</th>
        <th>Quantity</th>
        <th>Phase</th>
        <th>Phase Number</th>
        <th>Special Instruction</th>
        <th>Status</th>
        @if (showRequiredByColumn()) {
          <th>Required By</th>
        }
      </tr>
    </thead>
    <tbody>
      @if (phases().length > 0) {
        @for (phase of phases(); track trackPhase($index, phase); let i = $index) {
          <tr
            class="phase-row"
            tabindex="0"
            (click)="selectPhase(phase)"
            (keydown.enter)="selectPhase(phase)"
            (keydown.space)="selectPhase(phase); $event.preventDefault()"
          >
            <td>{{ i + 1 }}</td>
            <td>{{ getJobRef(phase.jobNumber) }}</td>
            <td>{{ phase.partNumber }} of {{ phase.jobParts }}</td>
            <td class="nowrap">
              {{ phase.name }} ({{ phase.oldName }})
            </td>
            <td>{{ phase.quantity }}</td>
            <td>{{ phase.phaseDescription }}</td>
            <td>{{ phase.phaseNumber }}</td>
            <td>{{ phase.specialInstruction }}</td>
            <td>{{ statusLabel(phase.phaseStatus) }}</td>
            @if (showRequiredByColumn()) {
              <td>{{ requiredBy(phase) }}</td>
            }
          </tr>
        }
      } @else {
        <tr>
          <td [attr.colspan]="emptyColspan()">
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
  readonly phaseSelected = output<ScheduledJobPhase>();

  private readonly jobService = inject(JobService);

  phases = signal<ScheduledJobPhase[]>([]);
  showRequiredByColumn = computed(() =>
    this.phases().some(phase => this.shouldShowRequiredBy(phase))
  );

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

  getJobRef(job : number){
    return this.jobService.getJobRef(job);
  }

  trackPhase(index: number, phase: ScheduledJobPhase): string {
    return `${phase.jobId}:${phase.jobPartId}:${phase.jobPartPhaseId}`;
  }

  selectPhase(phase: ScheduledJobPhase): void {
    this.phaseSelected.emit(phase);
  }

  requiredBy(phase: ScheduledJobPhase): string {
    if (!this.shouldShowRequiredBy(phase)) {
      return '';
    }

    return this.formatTime(phase.plannedStartAt);
  }

  emptyColspan(): number {
    return this.showRequiredByColumn() ? 10 : 9;
  }

  private shouldShowRequiredBy(phase: ScheduledJobPhase): boolean {
    return !!phase.plannedStartAt && !phase.actualStartAt;
  }

  private formatTime(value: string | null): string {
    if (!value) {
      return '';
    }

    const match = value.match(/T(\d{2}:\d{2})/);
    if (match) {
      return match[1];
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
