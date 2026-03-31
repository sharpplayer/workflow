import { CommonModule } from '@angular/common';
import { Component, input, output, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface CustomerFormModel {
  code: string;
  name: string;
  zone: string;
  contact: string;
  contactNumber: string;
}

@Component({
  selector: 'admin-customer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <div class="modal-backdrop">
        <div class="modal-card">
          <h3>Add Customer</h3>

          <div class="modal-form">
            <label>
              Code
              <input type="text" [(ngModel)]="localModel.code" />
            </label>

            <label>
              Name
              <input type="text" [(ngModel)]="localModel.name" />
            </label>

            <label>
              Zone
              <input type="text" [(ngModel)]="localModel.zone" />
            </label>

            <label>
              Contact
              <input type="text" [(ngModel)]="localModel.contact" />
            </label>

            <label>
              Contact Number
              <input type="text" [(ngModel)]="localModel.contactNumber" />
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" (click)="cancel.emit()">Cancel</button>
            <button type="button" (click)="onSave()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./admin-customer.component.css']
})
export class AdminCustomerComponent {
  visible = input<boolean>(false);
  saving = input<boolean>(false);
  model = input<CustomerFormModel | null>(null);

  save = output<CustomerFormModel>();
  cancel = output<void>();

  // internal editable copy
  localModel: CustomerFormModel = this.emptyModel();

  constructor() {
    effect(() => {
      const incoming = this.model();

      if (incoming) {
        this.localModel = { ...incoming };
      }
    });
  }

  private emptyModel(): CustomerFormModel {
    return {
      code: '',
      name: '',
      zone: '',
      contact: '',
      contactNumber: ''
    };
  }

  onSave() {
    this.save.emit({ ...this.localModel });
  }
}