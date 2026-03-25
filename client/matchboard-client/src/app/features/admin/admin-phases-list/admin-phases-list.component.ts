// admin-phases.component.ts
import { Component, effect, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Phase, ProductService } from '../../../core/services/product.service';
import { AdminPhaseComponent } from '../admin-phase/admin-phase.component';

@Component({
    selector: 'admin-phases-list',
    standalone: true,
    imports: [CommonModule, AdminPhaseComponent],
    template: `
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Phase</th>
                        <th>Description</th>
                        <th></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @for (phase of editablePhases(); track phase.order)
                    {
                        <tr>
                            <td>{{ phase.order }}</td>
                            <td>{{ phase.description }}</td>
                            <td>
                                <table class="phase-param-table">
                                    <thead>
                                        <tr>
                                            @for (phaseParam of phase.params; track $index) {
                                                <th>{{ phaseParam.paramName }}</th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            @for (phaseParam of phase.params; track $index) {
                                                <td>{{ phaseParam.paramConfig }}</td>
                                            }
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                             <td class="phase-actions">
                                <button (click)="deletePhase(phase)">-</button>
                                <button (click)="moveUp(phase)" [disabled]="phase.order === 1">↑</button>
                                <button (click)="moveDown(phase)" [disabled]="phase.order === editablePhases().length">↓</button>
                            </td>
                        </tr>
                    }
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="add-phase-row" (click)="openModal()">
                            + Add Phase
                        </td>
                        <td colspan="3" class="add-phase-row" (click)="savePhases()">
                            + Save
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        @if (isModalOpen()) {
            <admin-phase (close)="closeModal()" (phaseSelected)="onPhaseSelected($event)" />
        }
    `,
    styleUrl: './admin-phases-list.component.css'
})
export class AdminPhasesComponent {
    protected productService = inject(ProductService);
    protected isModalOpen = signal(false);
    protected editablePhases = signal<Phase[]>([]);
    @Input({ required: true }) productId!: number;

    constructor() {
        effect(() => {
            this.editablePhases.set([...this.productService.productPhases()]);
        });
    }

    openModal() { this.isModalOpen.set(true); }
    closeModal() { this.isModalOpen.set(false); }

    async onPhaseSelected(phase: Phase) {
        let p = await this.productService.resolvePhase(this.productId, phase.id);
        p.order = this.editablePhases().length + 1;
        p.description = phase.description + "(" + p.order + ")";
        console.log("ON PHASE:" + p.description + ":" + p.order + ":" + this.editablePhases().length);
        this.editablePhases.update(phases => [...phases, p]);
        this.closeModal();
    }

    async savePhases() {
        const phases = this.editablePhases();
        try {
            const phases = this.editablePhases();

            await this.productService.savePhases(this.productId, phases);

            console.log('Saved!');
        } catch (error) {
            console.error('Failed to save phases', error);
        }
    }

    deletePhase(phaseToDelete: Phase) {
        this.editablePhases.update(phases =>
            phases.filter(phase => phase !== phaseToDelete)
                .map((phase, index) => ({ ...phase, order: index + 1 })) // reassign order
        );
    }

    moveUp(phaseToMove: Phase) {
        this.editablePhases.update(phases => {
            const index = phases.indexOf(phaseToMove);
            if (index > 0) {
                const newPhases = [...phases];
                [newPhases[index - 1], newPhases[index]] = [newPhases[index], newPhases[index - 1]];
                return newPhases.map((phase, idx) => ({ ...phase, order: idx + 1 }));
            }
            return phases;
        });
    }

    moveDown(phaseToMove: Phase) {
        this.editablePhases.update(phases => {
            const index = phases.indexOf(phaseToMove);
            if (index < phases.length - 1) {
                const newPhases = [...phases];
                [newPhases[index], newPhases[index + 1]] = [newPhases[index + 1], newPhases[index]];
                return newPhases.map((phase, idx) => ({ ...phase, order: idx + 1 }));
            }
            return phases;
        });
    }
}
