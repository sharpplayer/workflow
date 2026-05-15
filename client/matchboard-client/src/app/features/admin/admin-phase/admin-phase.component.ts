// admin-phase.component.ts
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Phase, ProductService } from '../../../core/services/product.service';
import { ConfigService, MachineInput } from '../../../core/services/config.service';

type EditingFlag = 'create' | 'edit' | 'none';
type MachineScope = 'na' | 'all' | 'specific';

interface EditablePhase {
  id: number;
  description: string;
  order: number;
  params: EditableParam[];
  editing?: EditingFlag;
  expanded?: boolean;
  usage: number;
  machineIds: number[] | null;
  machineScope: MachineScope;
}

interface EditableParam {
  id: number;
  input: number;
  paramName: string;
  paramConfig: string;
  paramEvaluation: string;
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
      <col class="col-machines">
      <col class="col-usage">
      <col class="col-params">
      <col class="col-actions">
    </colgroup>

    <thead>
      <tr>
        <th>Description</th>
        <th>Machines</th>
        <th>Usage</th>
        <th>Parameters</th>
        <th class="actions-col"></th>
      </tr>
    </thead>

    <tbody>
      @for (phase of editablePhases(); track phase.id) {
        <tr [class.selected]="selectedPhaseId() === phase.id">
          <td>
            @if (phase.editing !== 'none') {
              <input [(ngModel)]="phase.description" />
            } @else {
              {{ phase.description }}
            }
          </td>

          <td class="compact-cell">

            <!-- SCOPE (radio group) -->
            <div class="chip-group machine-scope">
              <span class="group-label">Machines:</span>

              <label class="chip radio-chip">
                <input
                  type="radio"
                  name="machineScope-{{ phase.id }}"
                  [checked]="phase.machineScope === 'na'"
                  [disabled]="phase.editing === 'none'"
                  (change)="setMachineScope(phase, 'na')"
                />
                <span>N/A</span>
              </label>

              <label class="chip radio-chip">
                <input
                  type="radio"
                  name="machineScope-{{ phase.id }}"
                  [checked]="phase.machineScope === 'all'"
                  [disabled]="phase.editing === 'none'"
                  (change)="setMachineScope(phase, 'all')"
                />
                <span>All</span>
              </label>

              <label class="chip radio-chip">
                <input
                  type="radio"
                  name="machineScope-{{ phase.id }}"
                  [checked]="phase.machineScope === 'specific'"
                  [disabled]="phase.editing === 'none'"
                  (change)="setMachineScope(phase, 'specific')"
                />
                <span>Specific</span>
              </label>
            </div>

            <!-- ONLY SHOW WHEN SPECIFIC -->
            @if (phase.machineScope === 'specific') {

              <div class="machine-divider"></div>

              <div class="chip-group machine-options">
                <span class="group-label">Machines</span>

                @for (machine of machines(); track machine.id) {
                  <label class="chip checkbox-chip">
                    <input
                      type="checkbox"
                      [checked]="isMachineSelected(phase, machine.id)"
                      [disabled]="phase.editing === 'none'"
                      (change)="toggleMachine(phase, machine.id, $any($event.target).checked)"
                    />
                    <span>{{ machine.name }}</span>
                  </label>
                }
              </div>

              @if (phase.machineIds?.length === 0) {
                <div class="error-message">Select at least one machine.</div>
              }
            }

          </td>

          <td class="compact-cell">
            <div class="chip-group">
              @for (opt of usageOptions; track opt.value) {
                <label class="chip">
                  <input
                    type="checkbox"
                    [checked]="isUsageSelected(phase, opt.value)"
                    [disabled]="phase.editing === 'none'"
                    (change)="toggleUsage(phase, opt.value, $any($event.target).checked)"
                  />
                  <span>{{ opt.label }}</span>
                </label>
              }
            </div>
          </td>

          <td>
            <table class="param-table">
              <colgroup>
                <col class="col-key">
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
                    <th class="example-header">
                      Example
                      <button type="button" (click)="toggleExpanded(phase)">
                        {{ phase.expanded ? '▲' : '▼' }}
                      </button>
                    </th>
                  } @else {
                    <th></th>
                  }
                </tr>
              </thead>

              <tbody>
                @if (phase.expanded) {
                  @for (param of phase.params; track param.id) {
                    <tr>
                      @if (phase.editing !== 'none') {
                        <td><input [(ngModel)]="param.paramName" /></td>
                        <td>
                          <select [(ngModel)]="param.input">
                            @for (opt of inputOptions; track opt.value) {
                              <option [value]="opt.value">{{ opt.label }}</option>
                            }
                          </select>
                        </td>
                        <td><input [(ngModel)]="param.paramConfig" /></td>
                        <td><button type="button" (click)="removeParam(phase, param)">✕</button></td>
                      } @else {
                        <td>{{ param.paramName }}</td>
                        <td>{{ getInputLabel(param.input) }}</td>
                        <td>{{ param.paramConfig }}</td>
                        <td>{{ param.paramEvaluation }}</td>
                      }
                    </tr>
                  }

                  @if (phase.editing !== 'none') {
                    <tr class="add-param-row">
                      <td><input placeholder="Key" [(ngModel)]="newParamName" /></td>
                      <td>
                        <select [(ngModel)]="newParamInput">
                          @for (opt of inputOptions; track opt.value) {
                            <option [value]="opt.value">{{ opt.label }}</option>
                          }
                        </select>
                      </td>
                      <td><input placeholder="Value" [(ngModel)]="newParamValue" /></td>
                      <td><button type="button" (click)="addParam(phase)">+</button></td>
                    </tr>
                  }

                  <tr>
                    <td colspan="4" class="footer-text">
                      Input (when value populated): JC=Job Create; JS=Job Schedule; PR=Phase Run
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </td>

          <td class="actions">
            <button
              type="button"
              [disabled]="anyPhaseEditing()"
              (click)="selectPhase(phase)"
            >
              Select
            </button>

            @if (phase.editing === 'none') {
              <button type="button" [disabled]="anyPhaseEditing()" (click)="startEdit(phase)">Edit</button>
            } @else {
              <button
                type="button"
                (click)="saveEdit(phase)"
              >
                Save
              </button>
              <button type="button" (click)="cancelEdit()">Cancel</button>
            }
          </td>
        </tr>
      }
    </tbody>

    <tfoot>
      <tr>
        <td colspan="5">
          <table class="footer-table" width="100%">
            <tr>
              <td class="footer-actions" style="text-align: right;">
                <button type="button" [disabled]="anyPhaseEditing()" (click)="addPhase()">Create Phase</button>
                <button type="button" [disabled]="anyPhaseEditing()" (click)="onCancel()">Close</button>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </tfoot>
  </table>
</div>
  `,
  styleUrls: ['./admin-phase.component.css']
})
export class AdminPhaseComponent implements OnInit {
  readonly INPUT_JOB_CREATE = 1;
  readonly INPUT_JOB_SCHEDULE = 2;
  readonly INPUT_PHASE_RUN = 3;
  readonly INPUT_PHASE_COMPLETE = 4;

  readonly USAGE_FROM_CALL_OFF = 1;
  readonly USAGE_TO_CALL_OFF = 2;
  readonly USAGE_PER_RPI = 4;
  readonly USAGE_PER_MACHINE = 8;
  readonly USAGE_PER_PRODUCT_PACK = 16;
  readonly USAGE_PER_RPI_LEFT_RIGHT = 32;
  readonly USAGE_CROSS_JOB = 64;
  readonly USAGE_PER_PALLET = 128;

  protected productService = inject(ProductService);
  protected configService = inject(ConfigService);

  public close = output<void>();
  public phaseSelected = output<Phase>();

  excludedPhaseIds = input<number[]>([]);
  readonly machineFilter = input.required<number[]>();

  editablePhases = signal<EditablePhase[]>([]);
  machines = signal<MachineInput[]>([]);
  selectedPhaseId = signal<number | null>(null);

  anyPhaseEditing = computed(() =>
    this.editablePhases().some(p => p.editing !== 'none')
  );

  newParamName = '';
  newParamInput = this.INPUT_JOB_CREATE;
  newParamValue = '';

  private snapshot: EditablePhase[] = [];

  readonly inputOptions = [
    { label: 'JC', value: this.INPUT_JOB_CREATE },
    { label: 'JS', value: this.INPUT_JOB_SCHEDULE },
    { label: 'PR', value: this.INPUT_PHASE_RUN },
    { label: 'PC', value: this.INPUT_PHASE_COMPLETE }
  ];

  readonly usageOptions = [
    { label: 'From Allocation Phase', value: this.USAGE_FROM_CALL_OFF },
    { label: 'Call Off Stock Phase', value: this.USAGE_TO_CALL_OFF },
    { label: 'Per RPI Phase', value: this.USAGE_PER_RPI },
    { label: 'Per Product Pack Phase', value: this.USAGE_PER_PRODUCT_PACK },
    { label: 'Per RPI Left/Right Phase', value: this.USAGE_PER_RPI_LEFT_RIGHT },
    { label: 'Cross Job Phase', value: this.USAGE_CROSS_JOB },
    { label: 'Per Pallet Phase', value: this.USAGE_PER_PALLET }
  ];

  ngOnInit(): void {
    void this.loadAllPhases();
  }

  async loadAllPhases(): Promise<void> {
    const [phases, machines] = await Promise.all([
      this.productService.loadAllPhases(),
      this.configService.getMachineList()
    ]);

    const excluded = new Set(this.excludedPhaseIds());

    const mapped = phases
      .filter(p => !excluded.has(p.id))
      .filter(p => this.phaseMatchesMachineFilter(p))
      .map(p => this.fromPhase(p, false));

    this.editablePhases.set(mapped);
    this.machines.set(machines);
  }

  private phaseMatchesMachineFilter(phase: Phase): boolean {
    const filter = this.machineFilter();

    if (filter.length === 0) return true;
    if (phase.machineIds === null) return false;
    if (phase.machineIds.length === 0) return true;

    return phase.machineIds.some(machineId => filter.includes(machineId));
  }

  private getMachineScope(machineIds: number[] | null, usage : number): MachineScope {
    if (machineIds === null || (usage & this.USAGE_PER_MACHINE) === 0) return 'na';
    if (machineIds.length === 0) return 'all';
    return 'specific';
  }

  private toPhase(p: EditablePhase): Phase {
    const phase: EditablePhase = JSON.parse(JSON.stringify(p));
    this.normalizeMachineUsage(phase);

    return {
      id: phase.id,
      description: phase.description,
      order: phase.order,
      params: phase.params.map((pp, i) => ({
        phaseId: phase.id,
        phaseParamId: pp.id || i + 1,
        phaseNumber: phase.order,
        input: pp.input,
        paramName: pp.paramName,
        paramConfig: pp.paramConfig,
        evaluation: ''
      })),
      usage: phase.usage,
      machineIds: phase.machineIds
    };
  }

  private fromPhase(p: Phase, expanded: boolean): EditablePhase {
    return {
      id: p.id,
      description: p.description,
      order: p.order,
      params: p.params.map(pp => ({
        id: pp.phaseParamId,
        paramName: pp.paramName,
        paramConfig: pp.paramConfig,
        paramEvaluation: pp.evaluation,
        input: pp.input
      })),
      editing: 'none',
      expanded,
      usage: p.usage,
      machineIds: p.machineIds,
      machineScope: this.getMachineScope(p.machineIds, p.usage)
    };
  }

  selectPhase(phase: EditablePhase): void {
    if (!this.isPhaseMachineSelectionValid(phase)) return;

    this.selectedPhaseId.set(phase.id);
    this.phaseSelected.emit(this.toPhase(phase));
  }

  startEdit(phase: EditablePhase): void {
    this.snapshot = JSON.parse(JSON.stringify(this.editablePhases()));
    phase.editing = 'edit';
    phase.expanded = true;
    this.editablePhases.set([...this.editablePhases()]);
  }

  async saveEdit(phase: EditablePhase): Promise<void> {
    if (!this.isPhaseMachineSelectionValid(phase)) return;

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

    const newPhase = this.fromPhase(result, false);

    if (phase.editing === 'create') {
      this.editablePhases.set([
        ...this.editablePhases().filter(p => p !== phase),
        newPhase
      ]);
    } else {
      this.editablePhases.set(
        this.editablePhases().map(p => p.id === phase.id ? newPhase : p)
      );
    }

    this.newParamName = '';
    this.newParamInput = this.INPUT_JOB_CREATE;
    this.newParamValue = '';
  }

  cancelEdit(): void {
    this.editablePhases.set(JSON.parse(JSON.stringify(this.snapshot)));
  }

  addPhase(): void {
    this.snapshot = JSON.parse(JSON.stringify(this.editablePhases()));

    const phases = [...this.editablePhases()];

    phases.push({
      id: Number(String(Date.now()).slice(-6)),
      description: '',
      order: phases.length + 1,
      params: [],
      editing: 'create',
      expanded: true,
      usage: 0,
      machineIds: null,
      machineScope: 'na'
    });

    this.editablePhases.set(phases);

    this.newParamName = '';
    this.newParamInput = this.INPUT_JOB_CREATE;
    this.newParamValue = '';
  }

  addParam(phase: EditablePhase): void {
    if (!this.newParamName) return;

    phase.params.push({
      id: Number(String(Date.now()).slice(-6)),
      paramName: this.newParamName,
      input: this.newParamInput,
      paramConfig: this.newParamValue,
      paramEvaluation: ''
    });

    this.newParamName = '';
    this.newParamInput = this.INPUT_JOB_CREATE;
    this.newParamValue = '';
  }

  removeParam(phase: EditablePhase, param: EditableParam): void {
    phase.params = phase.params.filter(p => p !== param);
  }

  onCancel(): void {
    this.close.emit();
  }

  getInputLabel(value: number): string {
    return this.inputOptions.find(opt => opt.value === value)?.label || '';
  }

  toggleExpanded(phase: EditablePhase): void {
    phase.expanded = !phase.expanded;
    this.editablePhases.set([...this.editablePhases()]);
  }

  isUsageSelected(phase: EditablePhase, usage: number): boolean {
    return (phase.usage & usage) === usage;
  }

  toggleUsage(phase: EditablePhase, usage: number, checked: boolean): void {
    phase.usage = checked
      ? phase.usage | usage
      : phase.usage & ~usage;
  }

  setMachineScope(phase: EditablePhase, scope: MachineScope): void {
    phase.machineScope = scope;

    if (scope === 'na') {
      phase.machineIds = null;
    }

    if (scope === 'all') {
      phase.machineIds = [];
    }

    if (scope === 'specific') {
      phase.machineIds = [];
    }

    this.normalizeMachineUsage(phase);
    this.editablePhases.set([...this.editablePhases()]);
  }

  isMachineSelected(phase: EditablePhase, machineId: number): boolean {
    return !!phase.machineIds?.includes(machineId);
  }

  toggleMachine(phase: EditablePhase, machineId: number, checked: boolean): void {
    const current = phase.machineIds ?? [];

    phase.machineIds = checked
      ? [...current.filter(id => id !== machineId), machineId]
      : current.filter(id => id !== machineId);

    phase.machineScope = 'specific';

    this.normalizeMachineUsage(phase);
    this.editablePhases.set([...this.editablePhases()]);
  }

  isPhaseMachineSelectionValid(phase: EditablePhase): boolean {
    return phase.machineScope !== 'specific' || !!phase.machineIds?.length;
  }

  private normalizeMachineUsage(phase: EditablePhase): void {
    if (phase.machineIds !== null) {
      phase.usage |= this.USAGE_PER_MACHINE;
    } else {
      phase.usage &= ~this.USAGE_PER_MACHINE;
    }
  }
}
