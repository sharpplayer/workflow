// admin-phase-modal/admin-phase-modal.component.ts
import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Phase, ProductService } from '../../../core/services/product.service';

interface PhaseForm {
    order: number | null;
    description: string;
    params: PhaseParamForm[];
}

interface PhaseParamForm {
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
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @for (phase of productService.allPhases(); track phase.id) {
                        <tr
                            [class.selected]="selectedPhase() === phase"
                            (click)="selectPhase(phase)">
                            <td>{{ phase.description }}</td>
                            <td>
                                <table class="phase-param-table">
                                    <thead>
                                        <tr>
                                            @for (phaseParam of phase.params; track phaseParam.phaseParamId) {
                                                <th>{{ phaseParam.paramName }}</th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            @for (phaseParam of phase.params; track phaseParam.phaseParamId) {
                                                <td>{{ phaseParam.paramConfig }}</td>
                                            }
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    }
                </tbody>
                <tfoot>
                    <tr>
                        <td class="add-phase-row" (click)="openModal()">
                            + Create New Phase
                        </td>
                        <td class="add-phase-row" (click)="onCancel()">
                            + Cancel
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `,
    styleUrl: './admin-phase.component.css'
})
export class AdminPhaseComponent {
    protected productService = inject(ProductService);
    protected isModalOpen = signal(false);
    protected selectedPhase = signal<Phase | null>(null);
    public close = output<void>();
    phaseSelected = output<Phase>();
    loading = signal(true);
    error = signal('');

    constructor() {
        this.loadAllPhases();
    }
    openModal() {
        this.isModalOpen.set(true);
    }
    onCancel() { this.close.emit(); }

    async loadAllPhases() {
        console.log("SSSSS");
        this.loading.set(true);
        this.error.set('');
        try {
            await this.productService.loadAllPhases();
        } catch (err) {
            console.error(err);
            this.error.set('Failed to load phases');
        } finally {
            this.loading.set(false);
        }
    }

    selectPhase(phase: Phase) {
        console.log("SELECTED:" + phase.description)
        this.selectedPhase.set(phase);
        this.phaseSelected.emit(phase);
    }
}