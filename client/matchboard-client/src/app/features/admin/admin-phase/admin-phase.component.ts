// admin-phase.component.ts
import { Component, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Phase, ProductService } from '../../../core/services/product.service';

type EditingFlag = 'create' | 'edit' | 'none';

interface EditablePhase {
  id: number;
  description: string;
  order: number;
  params: EditableParam[];
  editing?: EditingFlag;
}

interface EditableParam {
  id: number;
  input: boolean;
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
  <colgroup>
      <col class="col-description">
      <col>
    </colgroup>
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
            @if (phase.editing !== 'none') {
              <input [(ngModel)]="phase.description" />
            } @else {
              {{ phase.description }}
            }
          </td>

          <!-- PARAMETERS -->
          <td>
            <table class="param-table">
            <colgroup>
                <col>
                <col class="col-input">
                <col class="col-value">
                <col class="col-example">
              </colgroup>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Input</th>
                  <th>Value</th>
                  @if (phase.editing === 'none') {
                    <th>Example</th>
                  }
                  @else {
                    <th></th>
                  }
                </tr>
              </thead>

              <tbody>
                @for (param of phase.params; track param.id) {
                  <tr>
                    @if (phase.editing !== 'none') {
                      <td>
                        <input [(ngModel)]="param.paramName" />
                      </td>
                    <td>
                        <input type="checkbox" placeholder="Input" [(ngModel)]="param.input" />
                    </td>
                      <td>
                        <input [(ngModel)]="param.paramConfig" />
                      </td>
                      <td>
                        <button (click)="removeParam(phase, param)">✕</button>
                      </td>
                    } @else {
                      <td>{{ param.paramName }}</td>
                      <td>{{ param.input ? "Y" : "N" }}</td>
                      <td>{{ param.paramConfig.split(';')[0] }}</td>
                      <td>{{ (param.paramConfig.split(';')[1] || '') }}</td>
                    }
                  </tr>
                }

                @if (phase.editing !== 'none') {
                  <tr class="add-param-row">
                    <td>
                      <input placeholder="Key" [(ngModel)]="newParamName" />
                    </td>
                    <td>
                      <input type="checkbox" placeholder="Input" [(ngModel)]="newParamInput" />
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
            <button [disabled]="anyPhaseEditing()" (click)="selectPhase(phase)">Select</button>

            @if (phase.editing === 'none') {
              <button [disabled]="anyPhaseEditing()" (click)="startEdit(phase)">Edit</button>
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
            <td colspan="3">
            <div class="footer-actions">
                <button [disabled]="anyPhaseEditing()" (click)="addPhase()">Create Phase</button>
                <button [disabled]="anyPhaseEditing()" (click)="onCancel()">Close</button>
            </div>
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
  anyPhaseEditing = computed(() => this.editablePhases().some(p => p.editing !== 'none'));

  newParamName = '';
  newParamInput = false;
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

    const mapped: EditablePhase[] =
      this.productService.allPhases().map(p => this.fromPhase(p));

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
        input: pp.input,
        paramName: pp.paramName,
        paramConfig: pp.paramConfig
      }))
    };
  }

  private fromPhase(p: Phase): EditablePhase {
    return {
      id: p.id,
      description: p.description,
      order: p.order,
      params: p.params.map(pp => ({
        id: pp.phaseParamId,
        paramName: pp.paramName,
        paramConfig: pp.paramConfig,
        input: pp.input
      })),
      editing: 'none'
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
    phase.editing = 'edit';
    this.editablePhases.set([...this.editablePhases()]);
  }

  async saveEdit(phase: EditablePhase) {
    // If user typed a new param but didn't click "+"
    if (this.newParamName) {
      this.addParam(phase);
    }

    let result: Phase;

    if (phase.editing === 'create') {
      result = await this.productService.createPhase(this.toPhase(phase));
    } else {
      result = await this.productService.createPhase(this.toPhase(phase));
      // result = await this.productService.updatePhase(this.toPhase(phase));
    }

    const newPhase = this.fromPhase(result);

    if (phase.editing === 'create') {
      this.editablePhases.set([
        ...this.editablePhases().filter(p => p !== phase),
        newPhase
      ]);
    } else {
      this.editablePhases.set(
        this.editablePhases().map(p =>
          p.id === phase.id ? newPhase : p
        )
      );
    }

    // Reset new param inputs
    this.newParamName = '';
    this.newParamInput = false;
    this.newParamValue = '';
  }

  cancelEdit() {
    this.editablePhases.set(JSON.parse(JSON.stringify(this.snapshot)));
  }

  // =========================
  // PHASE
  // =========================
  addPhase() {
    this.snapshot = JSON.parse(JSON.stringify(this.editablePhases()));
    const phases = [...this.editablePhases()];
    phases.push({
      id: Number(String(Date.now()).slice(-6)),
      description: '',
      order: phases.length + 1,
      params: [],
      editing: 'create'
    });

    this.editablePhases.set(phases);
  }

  // =========================
  // PARAMS
  // =========================
  addParam(phase: EditablePhase) {
    if (!this.newParamName) return;

    phase.params.push({
      id: Number(String(Date.now()).slice(-6)),
      paramName: this.newParamName,
      input: this.newParamInput,
      paramConfig: this.newParamValue
    });

    this.newParamName = '';
    this.newParamInput = false;
    this.newParamValue = '';
  }

  removeParam(phase: EditablePhase, param: EditableParam) {
    phase.params = phase.params.filter(p => p !== param);
  }

  // =========================
  // CLOSE
  // =========================
  onCancel() {
    this.close.emit();
  }
}