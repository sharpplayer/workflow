import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPhaseComponent } from '../admin-phase/admin-phase.component';
import { Phase, PhaseParam, ProductService } from '../../../core/services/product.service';

export interface JobPhase {
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
              <span class="phase-count">({{ phaseCount() }})</span>
              and <span class="clickable" (click)="tableExpanded.update(e => true)">Special Instructions</span>
            </th>
            <th colspan="2" style="text-align:right">
              <button type="button" (click)="tableExpanded.update(e => !e)">
                {{ tableExpanded() ? '▲' : '▼' }}
              </button>
            </th>
          </tr>

          @if (tableExpanded()) {
            <tr>
              <th>Phase</th>
              <th>Description</th>
              <th></th>
              <th>Special Instruction</th>
              <th></th>
            </tr>
          }
        </thead>

        @if (tableExpanded()) {
          <tbody>
            @for (jp of editablePhases(); track jp.order) {
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
                          <td>{{ shrink(phaseParam.paramConfig, phaseParam.evaluation) }}</td>
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
                  <button type="button" (click)="deletePhase(jp)">-</button>
                  <button type="button" (click)="moveUp(jp)" [disabled]="jp.order === 1">↑</button>
                  <button type="button" (click)="moveDown(jp)" [disabled]="jp.order === editablePhases().length">↓</button>
                </td>
              </tr>
            }
          </tbody>

          <tfoot>
            <tr>
              <td colspan="3">
                @if (phaseCount() === 0) {
                  <span class="error-message">This product has no phases.</span>
                }
              </td>
              <td colspan="2" class="add-phase-row">
                <button type="button" (click)="addPhase()">Add Phase</button>
                <button
                  type="button"
                  (click)="savePhases()"
                  [disabled]="!hasUnsavedChanges()"
                >
                  Update Product
                </button>
              </td>
            </tr>
          </tfoot>
        }
      </table>
    </div>

    @if (isModalOpen()) {
      <admin-phase
        [excludedPhaseIds]="selectedPhaseIds()"
        (close)="closeModal()"
        (phaseSelected)="onPhaseSelected($event)"
      />
    }
  `,
  styleUrl: './admin-phases-list.component.css'
})
export class AdminPhasesListComponent {
  protected readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  readonly productId = input.required<number>();
  readonly phasesSelected = output<PhasesSelected>();

  protected readonly isModalOpen = signal(false);
  protected readonly editablePhases = signal<JobPhase[]>([]);
  protected readonly tableExpanded = signal(false);
  protected readonly hasUnsavedChanges = signal(false);

  protected readonly selectedPhaseIds = computed(() =>
    this.editablePhases().map(jp => jp.phase.id)
  );

  protected readonly phaseCount = computed(() => this.editablePhases().length);

  private destroyed = false;
  private lastLoadedProductId: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });

    effect(() => {
      const productId = this.productId();

      if (productId === this.lastLoadedProductId) return;

      this.lastLoadedProductId = productId;
      void this.loadInitialPhases(productId);
    });
  }

  private async loadInitialPhases(productId: number): Promise<void> {
    const phasesFromService = await this.productService.loadProductPhases(productId);

    if (this.destroyed) return;
    if (productId !== this.productId()) return;

    const phases: JobPhase[] = phasesFromService.map((p, i) => ({
      phase: p,
      specialInstruction: '',
      order: i + 1
    }));

    this.editablePhases.set(phases);
    this.hasUnsavedChanges.set(false);
    this.tableExpanded.set(phases.length === 0 || this.tableExpanded());
    this.emitFilteredParams();
  }

  addPhase(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  async onPhaseSelected(phase: Phase): Promise<void> {
    const resolvedPhase = await this.productService.resolvePhase(this.productId(), phase.id);

    if (this.destroyed) return;

    const jobPhase: JobPhase = {
      phase: {
        ...resolvedPhase,
        order: this.editablePhases().length + 1
      },
      specialInstruction: '',
      order: this.editablePhases().length + 1
    };

    this.editablePhases.set([...this.editablePhases(), jobPhase]);
    this.hasUnsavedChanges.set(true);

    this.closeModal();
    this.emitFilteredParams();
  }

  updateSpecialInstruction(jp: JobPhase, value: string): void {
    this.editablePhases.update(phases =>
      phases.map(p =>
        p === jp ? { ...p, specialInstruction: value } : p
      )
    );

    this.hasUnsavedChanges.set(true);
  }

  savePhases(): void {
    const phasesToSave = this.editablePhases().map(jp => ({
      ...jp.phase,
      order: jp.order
    }));

    this.productService.savePhases(this.productId(), phasesToSave)
      .then(() => {
        if (this.destroyed) return;
        this.hasUnsavedChanges.set(false);
      })
      .catch(err => console.error('Failed to save phases', err));
  }

  deletePhase(jp: JobPhase): void {
    this.editablePhases.update(phases =>
      phases
        .filter(p => p !== jp)
        .map((p, i) => ({
          ...p,
          order: i + 1
        }))
    );

    this.hasUnsavedChanges.set(true);
    this.emitFilteredParams();
  }

  moveUp(jp: JobPhase): void {
    this.editablePhases.update(phases => {
      const updated = [...phases];
      const index = updated.indexOf(jp);

      if (index > 0) {
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      }

      return updated.map((p, i) => ({
        ...p,
        order: i + 1
      }));
    });

    this.hasUnsavedChanges.set(true);
    this.emitFilteredParams();
  }

  moveDown(jp: JobPhase): void {
    this.editablePhases.update(phases => {
      const updated = [...phases];
      const index = updated.indexOf(jp);

      if (index < updated.length - 1) {
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      }

      return updated.map((p, i) => ({
        ...p,
        order: i + 1
      }));
    });

    this.hasUnsavedChanges.set(true);
    this.emitFilteredParams();
  }

  private emitFilteredParams(): void {
    if (this.destroyed) return;

    const editable = this.editablePhases();

    const filtered = editable.flatMap(jp =>
      jp.phase.params
        .filter(p => p.input === 1 || p.input === 2)
        .map(p => ({
          ...p,
          phaseId: jp.phase.id,
          phaseNumber: jp.order
        }))
    );

    this.phasesSelected.emit({
      phases: editable,
      params: filtered
    });
  }

  shrink(config: string, value: string): string {
    if (config.startsWith('SIGN')) {
      return config;
    }

    if (value.startsWith('(Input')) {
      return '(Input)';
    }

    return value;
  }
}