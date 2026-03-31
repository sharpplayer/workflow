import { CommonModule } from '@angular/common';
import { Component, input, output, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface CarrierFormModel {
  code: string;
  name: string;
}

@Component({
  selector: 'admin-carrier',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible()) {
      <div class="modal-backdrop">
        <div class="modal-card">
          <h3>Add Carrier</h3>

          <div class="modal-form">
            <label>
              Code
              <input type="text" [(ngModel)]="localModel.code" />
            </label>

            <label>
              Name
              <input type="text" [(ngModel)]="localModel.name" />
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
  styleUrls: ['./admin-carrier.component.css']
})
export class AdminCarrierComponent {
  visible = input<boolean>(false);
  saving = input<boolean>(false);
  model = input<CarrierFormModel | null>(null);

  save = output<CarrierFormModel>();
  cancel = output<void>();

  // internal editable copy
  localModel: CarrierFormModel = this.emptyModel();

  constructor() {
    effect(() => {
      const incoming = this.model();

      if (incoming) {
        this.localModel = { ...incoming };
      }
    });
  }

  private emptyModel(): CarrierFormModel {
    return {
      code: '',
      name: ''
    };
  }

  onSave() {
    this.save.emit({ ...this.localModel });
  }
}