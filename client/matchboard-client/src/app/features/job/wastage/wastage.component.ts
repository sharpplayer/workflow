import {
    Component,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateWastage, JobPartParam, JobService, WastageView } from '../../../core/services/job.service';
import { DeviceService } from '../../../core/services/device.service';

@Component({
    selector: 'wastage',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="dialog-backdrop">
      <div class="dialog">
        <div class="dialog-header">
          <h2>Wastage</h2>

          <button type="button" class="close-button" (click)="closed.emit()">
            ×
          </button>
        </div>

        @if (param(); as p) {
          <div class="param-name">
            {{ p.name }}
          </div>
        }

        @if (loading()) {
          <div class="message">Loading wastage...</div>
        } @else if (error()) {
          <div class="error">
            {{ error() }}
          </div>
        } @else {
          <div class="existing-section">
            <h3>Current Wastage</h3>

            @if (wastage().length > 0) {
              <table class="wastage-table">
                <thead>
                  <tr>
                    <th>RPI</th>
                    <th>Qty</th>
                    <th>Reason</th>
                    <th>By</th>
                  </tr>
                </thead>

                <tbody>
                  @for (item of wastage(); track $index) {
                    <tr>
                      <td>{{ item.rpi }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ item.reason }}</td>
                      <td>{{ item.reportedBy || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="empty-message">No wastage recorded.</div>
            }
          </div>

          <form class="wastage-form" (ngSubmit)="save()">
            <h3>Add Wastage</h3>

            <label>
                RPI
                <input
                    name="rpi"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    [(ngModel)]="rpi"
                    [disabled]="saving()"
                    required
                />
                </label>


            <label>
              Quantity
              <input
                name="quantity"
                type="number"
                inputmode="numeric"
                min="1"
                [(ngModel)]="quantity"
                [disabled]="saving()"
                required
              />
            </label>

            <label>
              Reason
              <textarea
                name="reason"
                rows="3"
                [(ngModel)]="reason"
                [disabled]="saving()"
                required>
              </textarea>
            </label>

            <label>
                Reported By
                <input
                    name="reportedBy"
                    type="text"
                    [(ngModel)]="reportedBy"
                    [disabled]="saving()"
                    required
                />
                </label>

            @if (validationMessage()) {
              <div class="error">
                {{ validationMessage() }}
              </div>
            }

            <div class="dialog-actions">
              <button
                type="button"
                class="secondary-button"
                [disabled]="saving()"
                (click)="closed.emit()">
                Cancel
              </button>

              <button
                type="submit"
                class="primary-button"
                [disabled]="saving()">
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
    styleUrl: './wastage.component.css'
})
export class WastageComponent {
    private readonly jobService = inject(JobService);
    private readonly deviceService = inject(DeviceService);

    readonly jobPhaseId = input.required<number>();
    readonly param = input<JobPartParam | null>(null);

    readonly closed = output<void>();
    readonly saved = output<WastageView>();

    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly wastage = signal<WastageView[]>([]);

    rpi = '';
    quantity: number | null = null;
    reason = '';
    reportedBy = '';

    readonly submitted = signal(false);

    readonly validationMessage = computed(() => {
        if (!this.submitted()) {
            return null;
        }

        if (!this.reportedBy.trim()) {
            return 'Reported by is required.';
        }

        const rpi = this.rpi.trim();

        if (!rpi) {
            return 'RPI is required.';
        }

        if (!/^\d+$/.test(rpi)) {
            return 'RPI must be a number.';
        }

        if (!this.quantity || this.quantity <= 0) {
            return 'Quantity must be greater than zero.';
        }

        if (!this.reason.trim()) {
            return 'Reason is required.';
        }

        return null;
    });

    async ngOnInit(): Promise<void> {
         this.reportedBy = this.deviceService.getStatus().users?.[0]?.user ?? '';
        await this.loadWastage();
    }

    async loadWastage(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);

        try {
            const result = await this.jobService.getWastageForJobPhase(this.jobPhaseId());
            this.wastage.set(result ?? []);
        } catch {
            this.error.set('Unable to load wastage.');
        } finally {
            this.loading.set(false);
        }
    }

    async save(): Promise<void> {
        this.submitted.set(true);

        if (this.validationMessage()) {
            return;
        }

        this.saving.set(true);
        this.error.set(null);

        const request: CreateWastage = {
            jobPhaseId: this.jobPhaseId(),
            rpi: Number(this.rpi.trim()),
            quantity: Number(this.quantity),
            reason: this.reason.trim(),
            reportedBy: this.reportedBy.trim()
        };

        try {
            const created = await this.jobService.createWastage(request);

            this.wastage.update(items => [...items, created]);

            this.rpi = '';
            this.quantity = null;
            this.reason = '';
            this.submitted.set(false);

            this.saved.emit(created);
        } catch {
            this.error.set('Unable to save wastage.');
        } finally {
            this.saving.set(false);
        }
    }
}