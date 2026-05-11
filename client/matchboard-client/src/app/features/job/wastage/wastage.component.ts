import {
  Component,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateWastage, JobPartParam, JobService, WastageView } from '../../../core/services/job.service';
import { DeviceService } from '../../../core/services/device.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';

@Component({
  selector: 'wastage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-backdrop">
      <div class="dialog">
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
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
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
                step="1"
                [(ngModel)]="quantity"
                [disabled]="saving()"
                required
              />
            </label>

            <label>
              Category
              <select
                name="category"
                [(ngModel)]="category"
                (ngModelChange)="onCategoryChange()"
                [disabled]="saving()"
                required>
                <option value="">Select category</option>

                @for (item of categories(); track item.key) {
                  <option [value]="item.key">
                    {{ item.value }}
                  </option>
                }
              </select>
            </label>

            <label>
              Reason
              <textarea
                name="reason"
                rows="3"
                [(ngModel)]="reason"
                [disabled]="saving() || category !== '0'"
                [required]="category === '0'">
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
                [disabled]="saving()"
                (click)="closed.emit()">
                Cancel
              </button>

              <button
                type="submit"
                [disabled]="saving() || !isFormValid()">
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
  private readonly configService = inject(ConfigService);

  readonly jobPhaseId = input.required<number>();
  readonly param = input<JobPartParam | null>(null);

  readonly closed = output<void>();
  readonly saved = output<WastageView>();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly wastage = signal<WastageView[]>([]);
  readonly categories = signal<ConfigItem[]>([]);
  readonly submitted = signal(false);

  rpi: number | null = null;
  quantity: number | null = null;
  category = '';
  reason = '';
  reportedBy = '';

  async ngOnInit(): Promise<void> {
    this.reportedBy = this.deviceService.getStatus().users?.[0]?.user ?? '';

    const config = await this.configService.getList('WASTAGEREASON');
    this.categories.set(config.value ?? []);

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

  validationMessage(): string | null {
    if (!this.submitted()) {
      return null;
    }

    if (!this.reportedBy.trim()) {
      return 'Reported by is required.';
    }

    if (this.rpi === null || !Number.isInteger(this.rpi) || this.rpi < 0) {
      return 'RPI must be numeric.';
    }

    if (this.quantity === null || !Number.isInteger(this.quantity) || this.quantity <= 0) {
      return 'Quantity must be greater than zero.';
    }

    if (!this.category) {
      return 'Category is required.';
    }

    if (this.category === '0' && !this.reason.trim()) {
      return 'Reason is required.';
    }

    return null;
  }

  isFormValid(): boolean {
    return (
      !!this.reportedBy.trim() &&
      this.rpi !== null &&
      Number.isInteger(this.rpi) &&
      this.rpi >= 0 &&
      this.quantity !== null &&
      Number.isInteger(this.quantity) &&
      this.quantity > 0 &&
      !!this.category &&
      (this.category !== '0' || !!this.reason.trim())
    );
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
      rpi: Number(this.rpi),
      quantity: Number(this.quantity),
      reason: this.reason.trim(),
      category: Number(this.category),
      reportedBy: this.reportedBy.trim()
    };

    try {
      const created = await this.jobService.createWastage(request);

      this.wastage.update(items => [...items, created]);

      this.rpi = null;
      this.quantity = null;
      this.reason = '';
      this.category = '';
      this.submitted.set(false);

      this.saved.emit(created);
    } catch {
      this.error.set('Unable to save wastage.');
    } finally {
      this.saving.set(false);
    }
  }

  onCategoryChange(): void {
    const selected = this.categories().find(x => x.key === this.category);

    if (!selected || selected.key === '0') {
      this.reason = '';
      return;
    }

    this.reason = selected.value;
  }
}