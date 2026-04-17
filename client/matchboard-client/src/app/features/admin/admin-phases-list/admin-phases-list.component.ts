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
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { AdminPhaseComponent } from '../admin-phase/admin-phase.component';
import { Phase, PhaseParam, ProductService } from '../../../core/services/product.service';

export interface JobPhase {
  phase: Phase;
  specialInstruction: string;
  order: number;
  selectedForDelete?: boolean;
}

export interface PhasesSelected {
  phases: JobPhase[];
  params: PhaseParam[];
}

@Component({
  selector: 'admin-phases-list',
  standalone: true,
  imports: [CommonModule, DragDropModule, AdminPhaseComponent],
  template: `
    <div>
      <table class="phases-table">
        <colgroup>
          <col class="col-drag" />
          <col class="col-select" />
          <col class="col-phase" />
          <col class="col-description" />
          <col class="col-params" />
          <col class="col-instruction" />
          <col class="col-empty" />
        </colgroup>
        <thead>
          <tr class="caption-row">
            <th colspan="7" class="caption-th">
              <div class="caption-bar">
                <button
                  type="button"
                  class="toggle-button"
                  (click)="tableExpanded.update(e => !e)"
                  aria-label="Toggle phases table"
                >
                  <span class="toggle-icon" [class.expanded]="tableExpanded()">▼</span>
                </button>

                <div class="caption-text">
                  Phases
                  <span class="phase-count">({{ phaseCount() }})</span>
                  and
                  <span class="clickable" (click)="tableExpanded.set(true)">
                    Special Instructions
                  </span>
                </div>
              </div>
            </th>
          </tr>
          <tr class="detail-header-row" [class.collapsed]="!tableExpanded()">
            <th class="drag-column"></th>
            <th class="select-column">Delete</th>
            <th>Phase</th>
            <th>Description</th>
            <th>Special Instruction</th>
            <th></th>
            <th></th>
          </tr>
        </thead>

        <tbody
          cdkDropList
          [cdkDropListData]="editablePhases()"
          (cdkDropListDropped)="drop($event)"
          [class.collapsed-section]="!tableExpanded()"
        >
          @for (jp of editablePhases(); track jp.phase.id) {
            <tr cdkDrag [class.marked-for-delete]="jp.selectedForDelete">
              <td class="drag-cell">
                <span
                  class="drag-handle"
                  cdkDragHandle
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                >
                  ⋮⋮
                </span>
              </td>

              <td class="select-cell">
                <input
                  type="checkbox"
                  [checked]="!!jp.selectedForDelete"
                  (change)="toggleDeleteSelection(jp, $any($event.target).checked)"
                  aria-label="Select phase for deletion"
                />
              </td>

              <td>{{ jp.order }}</td>
              <td>{{ jp.phase.description }}</td>
              <td>
                <textarea
                  class="special-instruction"
                  rows="2"
                  [value]="jp.specialInstruction"
                  (input)="updateSpecialInstruction(jp, $any($event.target).value)"
                ></textarea>
              </td>

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
              <td></td>
            </tr>
          }
        </tbody>

        <tfoot [class.collapsed-section]="!tableExpanded()">
          <tr>
            <td colspan="5">
              @if (phaseCount() === 0) {
                <span class="error-message">This product has no phases.</span>
              }
            </td>
            <td colspan="2" class="add-phase-row">
              <button type="button" (click)="addPhase()">Add Phase</button>
              <button
                type="button"
                (click)="deleteSelectedPhases()"
                [disabled]="selectedDeleteCount() === 0"
              >
                Delete Selected
              </button>
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

  protected readonly selectedDeleteCount = computed(() =>
    this.editablePhases().filter(jp => jp.selectedForDelete).length
  );

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
      order: i + 1,
      selectedForDelete: false
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

    const nextOrder = this.editablePhases().length + 1;

    const jobPhase: JobPhase = {
      phase: {
        ...resolvedPhase,
        order: nextOrder
      },
      specialInstruction: '',
      order: nextOrder,
      selectedForDelete: false
    };

    this.editablePhases.set([...this.editablePhases(), jobPhase]);
    this.hasUnsavedChanges.set(true);

    this.closeModal();
    this.emitFilteredParams();
  }

  updateSpecialInstruction(jp: JobPhase, value: string): void {
    this.editablePhases.update(phases =>
      phases.map(p => (p === jp ? { ...p, specialInstruction: value } : p))
    );

    this.hasUnsavedChanges.set(true);
  }

  toggleDeleteSelection(jp: JobPhase, checked: boolean): void {
    this.editablePhases.update(phases =>
      phases.map(p => (p === jp ? { ...p, selectedForDelete: checked } : p))
    );
  }

  deleteSelectedPhases(): void {
    this.editablePhases.update(phases =>
      phases
        .filter(p => !p.selectedForDelete)
        .map((p, i) => ({
          ...p,
          order: i + 1,
          selectedForDelete: false
        }))
    );

    this.hasUnsavedChanges.set(true);
    this.emitFilteredParams();
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

  drop(event: CdkDragDrop<JobPhase[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.editablePhases.update(phases => {
      const updated = [...phases];
      moveItemInArray(updated, event.previousIndex, event.currentIndex);

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