import {
    Component,
    DestroyRef,
    inject,
    Input,
    OnChanges,
    OnInit,
    output,
    signal,
    SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Phase, PhaseParam, ProductService } from '../../../core/services/product.service';
import { AdminPhaseComponent } from '../admin-phase/admin-phase.component';

interface JobPhase {
    phase: Phase;
    specialInstruction: string;
    order: number;
}

export interface PhasesSelected {
    phases: JobPhase[];
    params: PhaseParam[];
}

@Component({
    selector: 'admin-phases-list',
    standalone: true,
    imports: [CommonModule, AdminPhaseComponent],
    template: `
    <div>
      <table>
        <thead>
          <tr>
            <th colspan="3">
              Phases
              <span class="phase-count">({{ phaseCount }})</span>
            </th>
            <th colspan="2" style="text-align:right">
              <button (click)="tableExpanded.update(e => !e)">
                {{ tableExpanded() ? '▲' : '▼' }}
              </button>
            </th>
          </tr>
          @if(tableExpanded()){
            <tr>
              <th>Phase</th>
              <th>Description</th>
              <th></th>
              <th>Special Instruction</th>
              <th></th>
            </tr>
          }
        </thead>

        @if(tableExpanded()){
        <tbody>
          @for (jp of editablePhases(); track jp.order)
          {
            <tr>
              <td>{{ jp.order }}</td>
              <td>{{ jp.phase.description }}</td>
              <td>
                <table class="phase-param-table">
                  <thead>
                    <tr>
                      @for (phaseParam of jp.phase.params; track $index) {
                        <th>{{ phaseParam.paramName }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      @for (phaseParam of jp.phase.params; track $index) {
                        <td>{{ shrink(phaseParam.evaluation) }}</td>
                      }
                    </tr>
                  </tbody>
                </table>
              </td>
              <td>
                <textarea
                  class="special-instruction"
                  rows="2"
                  [value]="jp.specialInstruction"
                  (input)="updateSpecialInstruction(jp, $any($event.target).value)"
                ></textarea>
              </td>
              <td class="phase-actions">
                <button (click)="deletePhase(jp)">-</button>
                <button (click)="moveUp(jp)" [disabled]="jp.order === 1">↑</button>
                <button (click)="moveDown(jp)" [disabled]="jp.order === editablePhases().length">↓</button>
              </td>
            </tr>
          }
        </tbody>

        <tfoot>
          <tr>
            <td colspan="5" class="add-phase-row">
              <button (click)="addPhase()">Add Phase</button>
              <button
                (click)="savePhases()"
                [disabled]="!hasUnsavedChanges()"
              >
                Save Phases
              </button>
            </td>
          </tr>
        </tfoot>
        }
      </table>
    </div>

    @if (isModalOpen()) {
      <admin-phase
        (close)="closeModal()"
        (phaseSelected)="onPhaseSelected($event)"
      />
    }
  `,
    styleUrls: ['./admin-phases-list.component.css']
})
export class AdminPhasesListComponent implements OnInit, OnChanges {
    protected productService = inject(ProductService);
    private destroyRef = inject(DestroyRef);

    protected isModalOpen = signal(false);
    protected editablePhases = signal<JobPhase[]>([]);
    protected tableExpanded = signal(false);
    protected hasUnsavedChanges = signal(false);

    @Input({ required: true }) productId!: number;
    phasesSelected = output<PhasesSelected>();

    private destroyed = false;

    constructor() {
        this.destroyRef.onDestroy(() => {
            this.destroyed = true;
        });
    }

    ngOnInit(): void {
        this.loadInitialPhases();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['productId'] && !changes['productId'].firstChange) {
            this.loadInitialPhases();
        }
    }

    private async loadInitialPhases() {
        const phasesFromService = await this.productService.loadProductPhases(this.productId);

        if (this.destroyed) return;

        const phases: JobPhase[] = phasesFromService.map((p, i) => ({
            phase: p,
            specialInstruction: '',
            order: i + 1
        }));

        this.editablePhases.set(phases);
        this.hasUnsavedChanges.set(false);
        this.emitFilteredParams();
    }

    get phaseCount() {
        return this.editablePhases().length;
    }

    addPhase() {
        this.isModalOpen.set(true);
    }

    closeModal() {
        this.isModalOpen.set(false);
    }

    async onPhaseSelected(phase: Phase) {
        const resolvedPhase = await this.productService.resolvePhase(this.productId, phase.id);

        if (this.destroyed) return;

        resolvedPhase.order = this.editablePhases().length + 1;

        const jobPhase: JobPhase = {
            phase: resolvedPhase,
            specialInstruction: '',
            order: this.editablePhases().length + 1
        };

        this.editablePhases.set([...this.editablePhases(), jobPhase]);
        this.hasUnsavedChanges.set(true);

        this.closeModal();
        this.emitFilteredParams();
    }

    updateSpecialInstruction(jp: JobPhase, value: string) {
        jp.specialInstruction = value;
        this.editablePhases.set([...this.editablePhases()]);
        this.hasUnsavedChanges.set(true);
    }

    savePhases() {
        const phasesToSave = this.editablePhases().map(jp => {
            jp.phase.order = jp.order;
            return jp.phase;
        });

        this.productService.savePhases(this.productId, phasesToSave)
            .then(() => {
                if (this.destroyed) return;
                this.hasUnsavedChanges.set(false);
            })
            .catch(err => console.error('Failed to save phases', err));
    }

    deletePhase(jp: JobPhase) {
        this.editablePhases.update(phases => {
            const newPhases = phases.filter(p => p !== jp);
            newPhases.forEach((p, i) => (p.order = i + 1));
            return newPhases;
        });

        this.hasUnsavedChanges.set(true);
        this.emitFilteredParams();
    }

    moveUp(jp: JobPhase) {
        this.editablePhases.update(phases => {
            const index = phases.indexOf(jp);
            if (index > 0) {
                [phases[index - 1], phases[index]] = [phases[index], phases[index - 1]];
                phases.forEach((p, i) => (p.order = i + 1));
            }
            return [...phases];
        });

        this.hasUnsavedChanges.set(true);
        this.emitFilteredParams();
    }

    moveDown(jp: JobPhase) {
        this.editablePhases.update(phases => {
            const index = phases.indexOf(jp);
            if (index < phases.length - 1) {
                [phases[index], phases[index + 1]] = [phases[index + 1], phases[index]];
                phases.forEach((p, i) => (p.order = i + 1));
            }
            return [...phases];
        });

        this.hasUnsavedChanges.set(true);
        this.emitFilteredParams();
    }

    private emitFilteredParams() {
        if (this.destroyed) return;

        const editable = this.editablePhases();
        const filtered = editable.flatMap(jp =>
            jp.phase.params.filter(p => p.input === 1 || p.input === 2)
        );

        this.phasesSelected.emit({
            phases: editable,
            params: filtered
        });
    }

    shrink(value: string): string {
        if (value.startsWith('(Input')) {
            return '(Input)';
        }
        return value;
    }
}