// admin-phases.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';

@Component({
    selector: 'admin-phases-list',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Phase</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @for (phase of productService.phases(); track phase) {
                        <tr>
                            <td>{{ phase.order }}</td>
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
            </table>
        </div>
    `,
    styleUrl : './admin-phases-list.component.css'
})
export class AdminPhasesComponent {
    protected productService = inject(ProductService);
}