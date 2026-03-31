import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminJobComponent, ProductSave } from '../admin-job/admin-job.component';

// Extend ProductSelected to include a paramMap for easy lookup
export interface ProductSelectedWithMap extends ProductSave {
    paramMap: Map<number, string>;
}

export interface CrossJobParameters {
    paymentReceived: boolean,
    dueDate: string,
    customer: string,
    carrier: string
}

@Component({
    selector: 'admin-jobs',
    standalone: true,
    imports: [CommonModule, AdminJobComponent],
    template: `
    <div>
        <table>
            <thead>
                <tr>
                    <th>Part</th>
                    <th>Product</th>
                    <th>Sage Name</th>
                    <th>Quantity</th>
                    <th>From Call Off</th>
                    <th>For Call Off</th>
                </tr>
            </thead>
            <tbody>
                @if (jobs.length === 0) {
                    <tr>
                        <td colspan="6">No products added yet</td>
                    </tr>
                } @else {
                    @for (job of jobs; track $index; let jobIndex = $index) {
                        <tr
                            (click)="selectPart(job)"
                            [class.selected]="selectedPart() === job"
                        >
                            <td>{{ jobIndex + 1 }}</td>
                            <td>{{ job.product.name }}</td>
                            <td>{{ job.product.oldName }}</td>
                            <td>{{ job.paramMap.get(-1) }}</td>
                            <td>{{ job.paramMap.get(-4) === 'true' ? 'YES' : 'NO' }}</td>
                            <td>{{ job.paramMap.get(-3) === 'true' ? 'YES' : 'NO' }}</td>
                        </tr>
                    }
                }
            </tbody>
        </table>
    </div>

    <admin-job-page
        [crossJobParams]="crossJobParams()"
        [selectedPart]="selectedPart()"
        (productSave)="onProductSave($event)"
        (crossJobParamsChanged)="onCrossJobParams($event)"
    />
  `,
    styleUrl: './admin-jobs.component.css'
})
export class AdminJobsComponent {

    crossJobParams = signal<CrossJobParameters>({
        paymentReceived: false,
        dueDate: '',
        customer: '',
        carrier: ''
    });

    jobs: ProductSelectedWithMap[] = [];
    selectedPart = signal<ProductSelectedWithMap | null>(null);

    @ViewChild(AdminJobComponent)
    jobBuilder!: AdminJobComponent;

    onProductSave(save: ProductSave) {
        const paramMap = new Map(
            save.params.map(p => [p.phaseParamId, p.value])
        );

        const updatedPart: ProductSelectedWithMap = {
            mode: save.mode,
            product: save.product,
            params: save.params,
            paramMap
        };

        let originalPart = this.selectedPart();
        if (save.mode === 'update' && originalPart) {

            const index = this.jobs.findIndex(j => j === originalPart);

            if (index !== -1) {
                this.jobs[index] = updatedPart;
                this.jobs = [...this.jobs];
            } else {
                console.warn('Original part not found, adding instead');
                this.jobs = [...this.jobs, updatedPart];
            }
        } else {
            this.jobs = [...this.jobs, updatedPart];
        }

        this.selectedPart.set(null);

        this.jobBuilder.reset();
    }

    selectPart(job: ProductSelectedWithMap) {
        console.log("SELECTED JOB")
        this.selectedPart.set(job);
    }

    onCrossJobParams(crossJobParamsChange: CrossJobParameters) {
        console.log("JOB PARAM CHANGE :" + JSON.stringify(crossJobParamsChange));
        this.crossJobParams.set(crossJobParamsChange);
    }
}