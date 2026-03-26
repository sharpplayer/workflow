import { Component, effect, inject, Input, OnInit, output, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Phase, PhaseParam, ProductService } from '../../../core/services/product.service';
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
                    <td colspan="5" class="add-phase-row">
                        <button (click)="addPhase()">Add Phase</button>
                        <button (click)="savePhases()">Save Phases</button>
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
export class AdminPhasesListComponent  implements OnInit {
    protected productService = inject(ProductService);
    protected isModalOpen = signal(false);
    protected editablePhases = signal<JobPhase[]>([]);
    protected tableExpanded = signal(false);
    @Input({ required: true }) productId!: number;
    filteredPhaseParams = output<PhaseParam[]>();

    ngOnInit(): void {
        this.loadInitialPhases();
    }

    private async loadInitialPhases() {
        console.log(this.productId);
        const phasesFromService = await this.productService.loadProductPhases(this.productId); // await async call

        const phases: JobPhase[] = phasesFromService.map((p, i) => ({
            phase: p,
            specialInstruction: '',
            order: i + 1
        }));

        this.editablePhases.set(phases);
        this.emitFilteredParams();
    }
    // constructor() {
    //     effect(() => {
    //         const newPhases = this.productService.productPhases().map((p, i) => ({
    //             phase: p,
    //             specialInstruction: '',
    //             order: i + 1
    //         }));

    //         this.editablePhases.update(existing => {
    //             const existingIds = existing.map(jp => jp.phase.id);
    //             const merged = [...existing];
    //             for (const jp of newPhases) {
    //                 if (!existingIds.includes(jp.phase.id)) {
    //                     merged.push(jp);
    //                 }
    //             }
    //             return merged;
    //         });

    //         this.emitFilteredParams();
    //     });
    // }

    get phaseCount() {
        return this.editablePhases().length;
    }

    addPhase() { this.isModalOpen.set(true); }
    closeModal() { this.isModalOpen.set(false); }

    async onPhaseSelected(phase: Phase) {
        console.log("WOOOOO");
        const resolvedPhase = await this.productService.resolvePhase(this.productId, phase.id);
        resolvedPhase.order = this.editablePhases().length + 1;

        const jobPhase: JobPhase = {
            phase: resolvedPhase,
            specialInstruction: '',
            order: this.editablePhases().length + 1
        };

        this.editablePhases.set([...this.editablePhases(), jobPhase]); // use .set with new array

        console.log("WOOOOO:" + this.editablePhases().length);

        this.closeModal();
        this.emitFilteredParams();
    }

    updateSpecialInstruction(jp: JobPhase, value: string) {
        jp.specialInstruction = value; // mutate in place
        this.editablePhases.set([...this.editablePhases()]);
        console.log("WOOOOOX:" + this.editablePhases().length);
        // trigger signal
    }

    savePhases() {
        const phasesToSave = this.editablePhases().map(jp => {
            jp.phase.order = jp.order; // propagate top-level order to Phase
            return jp.phase;
        });

        this.productService.savePhases(this.productId, phasesToSave)
            .catch(err => console.error('Failed to save phases', err));
    }

    deletePhase(jp: JobPhase) {
        this.editablePhases.update(phases => {
            const newPhases = phases.filter(p => p !== jp);
            newPhases.forEach((p, i) => (p.order = i + 1));
            return newPhases;
        });
        console.log("WOOOOOD:" + this.editablePhases().length);

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
        console.log("WOOOOOU:" + this.editablePhases().length);

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
        console.log("WOOOOODWN:" + this.editablePhases().length);

    }

    private emitFilteredParams() {
        console.log("WOOOOOE1:" + this.editablePhases().length);
        const filtered = this.editablePhases()
            .flatMap(jp => jp.phase.params.filter(p => p.input === 1 || p.input === 2));

        this.filteredPhaseParams.emit(filtered);
        console.log("WOOOOOE2:" + this.editablePhases().length);

    }
}