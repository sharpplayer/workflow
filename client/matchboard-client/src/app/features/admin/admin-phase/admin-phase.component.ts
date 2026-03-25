// admin-phase.component.ts
import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Phase, ProductService } from '../../../core/services/product.service';

interface EditablePhase {
  id: number;
  description: string;
  order: number;
  params: EditableParam[];
  editing?: boolean;
}

interface EditableParam {
  id: number;
  paramName: string;
  paramConfig: string;
}

@Component({
  selector: 'admin-phase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="modal-card">
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Parameters</th>
        <th class="actions-col"></th>
      </tr>
    </thead>

    <tbody>
      @for (phase of editablePhases(); track phase.id) {
        <tr [class.selected]="selectedPhaseId() === phase.id">

          <!-- DESCRIPTION -->
          <td>
            @if (phase.editing) {
              <input [(ngModel)]="phase.description" />
            } @else {
              {{ phase.description }}
            }
          </td>

          <!-- PARAMETERS -->
          <td>
            <table class="param-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  @if (phase.editing) { <th></th> }
                </tr>
              </thead>

              <tbody>
                @for (param of phase.params; track param.id) {
                  <tr>
                    @if (phase.editing) {
                      <td>
                        <input [(ngModel)]="param.paramName" />
                      </td>
                      <td>
                        <input [(ngModel)]="param.paramConfig" />
                      </td>
                      <td>
                        <button (click)="removeParam(phase, param)">✕</button>
                      </td>
                    } @else {
                      <td>{{ param.paramName }}</td>
                      <td>{{ param.paramConfig }}</td>
                    }
                  </tr>
                }

                @if (phase.editing) {
                  <tr class="add-param-row">
                    <td>
                      <input placeholder="Key" [(ngModel)]="newParamName" />
                    </td>
                    <td>
                      <input placeholder="Value" [(ngModel)]="newParamValue" />
                    </td>
                    <td>
                      <button (click)="addParam(phase)">+</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </td>

          <!-- ACTIONS -->
          <td class="actions">
            <button (click)="selectPhase(phase)">Select</button>

            @if (!phase.editing) {
              <button (click)="startEdit(phase)">Edit</button>
            } @else {
              <button (click)="saveEdit(phase)">Save</button>
              <button (click)="cancelEdit()">Cancel</button>
            }
          </td>

        </tr>
      }
    </tbody>

    <tfoot>
      <tr>
        <td class="add-phase-row" (click)="addPhase()">
          + Create New Phase
        </td>
        <td></td>
        <td class="footer-actions">
          <button (click)="saveAll()">Apply</button>
          <button (click)="onCancel()">Close</button>
        </td>
      </tr>
    </tfoot>
  </table>
</div>
  `,
  styleUrls: ['./admin-phase.component.css']
})
export class AdminPhaseComponent {

  protected productService = inject(ProductService);

  // Outputs
  public close = output<void>();
  public phaseSelected = output<Phase>();

  // State
  editablePhases = signal<EditablePhase[]>([]);
  selectedPhaseId = signal<number | null>(null);

  newParamName = '';
  newParamValue = '';

  private snapshot: EditablePhase[] = [];

  constructor() {
    this.loadAllPhases();
  }

  // =========================
  // LOAD
  // =========================
  async loadAllPhases() {
    await this.productService.loadAllPhases();

    const mapped: EditablePhase[] = this.productService.allPhases().map(p => ({
      id: p.id,
      description: p.description,
      order: p.order,
      params: p.params.map(pp => ({
        id: pp.phaseParamId,
        paramName: pp.paramName,
        paramConfig: pp.paramConfig
      })),
      editing: false
    }));

    this.editablePhases.set(mapped);
  }

  // =========================
  // MAPPING
  // =========================
  private toPhase(p: EditablePhase): Phase {
    return {
      id: p.id,
      description: p.description,
      order: p.order,
      params: p.params.map((pp, i) => ({
        phaseParamId: pp.id || i + 1,
        paramName: pp.paramName,
        paramConfig: pp.paramConfig,
        input: false
      }))
    };
  }

  // =========================
  // SELECT
  // =========================
  selectPhase(phase: EditablePhase) {
    this.selectedPhaseId.set(phase.id);
    this.phaseSelected.emit(this.toPhase(phase));
  }

  // =========================
  // EDIT
  // =========================
  startEdit(phase: EditablePhase) {
    this.snapshot = JSON.parse(JSON.stringify(this.editablePhases()));
    phase.editing = true;
  }

  saveEdit(phase: EditablePhase) {
    phase.editing = false;
  }

  cancelEdit() {
    this.editablePhases.set(JSON.parse(JSON.stringify(this.snapshot)));
  }

  // =========================
  // PHASE
  // =========================
  addPhase() {
    const phases = [...this.editablePhases()];

    phases.push({
      id: Date.now(),
      description: '',
      order: phases.length + 1,
      params: [],
      editing: true
    });

    this.editablePhases.set(phases);
  }

  // =========================
  // PARAMS
  // =========================
  addParam(phase: EditablePhase) {
    if (!this.newParamName || !this.newParamValue) return;

    phase.params.push({
      id: Date.now(),
      paramName: this.newParamName,
      paramConfig: this.newParamValue
    });

    this.newParamName = '';
    this.newParamValue = '';
  }

  removeParam(phase: EditablePhase, param: EditableParam) {
    phase.params = phase.params.filter(p => p !== param);
  }

  // =========================
  // SAVE ALL
  // =========================
  saveAll() {
    const payload: Phase[] = this.editablePhases().map(p => this.toPhase(p));
    console.log('API PAYLOAD:', payload);
  }

  // =========================
  // CLOSE
  // =========================
  onCancel() {
    this.close.emit();
  }
}