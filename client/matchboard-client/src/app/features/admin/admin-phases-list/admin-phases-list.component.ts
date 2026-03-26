import { Component, effect, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Phase, ProductService } from '../../../core/services/product.service';
import { AdminPhaseComponent } from '../admin-phase/admin-phase.component';

interface JobPhase {
    phase: Phase;
    specialInstruction: string;
    order: number; // top-level order
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
                                            <td>{{ phaseParam.evaluation }}</td>
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
                    <td colspan="3" class="add-phase-row" (click)="openModal()">
                        + Add Phase
                    </td>
                    <td colspan="3" class="add-phase-row" (click)="savePhases()">
                        + Save
                    </td>
                </tr>
            </tfoot>
            }
        </table>
    </div>

    @if (isModalOpen()) {
        <admin-phase (close)="closeModal()" (phaseSelected)="onPhaseSelected($event)" />
    }
    `,
    styleUrls: ['./admin-phases-list.component.css']
})
export class AdminPhasesListComponent {
    protected productService = inject(ProductService);
    protected isModalOpen = signal(false);
    protected editablePhases = signal<JobPhase[]>([]);
    protected tableExpanded = signal(false);
    @Input({ required: true }) productId!: number;

    constructor() {
        effect(() => {
            const phases = this.productService.productPhases().map((p, i) => ({
                phase: p,
                specialInstruction: '',
                order: i + 1
            }));
            this.editablePhases.set(phases);
        });
    }

    get phaseCount() {
        return this.editablePhases().length;
    }

    openModal() { this.isModalOpen.set(true); }
    closeModal() { this.isModalOpen.set(false); }

    async onPhaseSelected(phase: Phase) {
        const resolvedPhase = await this.productService.resolvePhase(this.productId, phase.id);
        const newOrder = this.editablePhases().length + 1;

        const jobPhase: JobPhase = {
            phase: resolvedPhase,
            specialInstruction: '',
            order: newOrder
        };

        this.editablePhases.update(phases => [...phases, jobPhase]);
        this.closeModal();
    }

    updateSpecialInstruction(jp: JobPhase, value: string) {
        jp.specialInstruction = value; // mutate in place
        this.editablePhases.set([...this.editablePhases()]); // trigger signal
    }

    savePhases() {
        const phasesToSave = this.editablePhases().map(jp => {
            jp.phase.order = jp.order; // propagate top-level order to Phase
            return jp.phase;
        });

        this.productService.savePhases(this.productId, phasesToSave)
            .then(() => console.log('Saved!'))
            .catch(err => console.error('Failed to save phases', err));
    }

    deletePhase(jp: JobPhase) {
        this.editablePhases.update(phases => {
            const newPhases = phases.filter(p => p !== jp);
            newPhases.forEach((p, i) => (p.order = i + 1));
            return newPhases;
        });
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
    }
}