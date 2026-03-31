import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminJobComponent, ProductSelected } from '../admin-job/admin-job.component';

// Extend ProductSelected to include a paramMap for easy lookup
interface ProductSelectedWithMap extends ProductSelected {
    paramMap: Map<number, string>;
}

export interface CrossJobParameters  {
    paymentReceived : boolean,
    dueDate : string,
    customer: string
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
                <th>Call Off</th>
                <th>Finished</th>
                </tr>
            </thead>
            <tbody>
                @if (jobs.length === 0) {
                <tr>
                    <td colspan="6">No products added yet</td>
                </tr>
                } @else {
                    @for (job of jobs; track jobIndex; let jobIndex = $index) {
                        <tr>
                        <td>{{ jobIndex + 1 }}</td>
                        <td>{{ job.product.name }}</td>
                        <td>{{ job.product.oldName }}</td>
                        <td>{{ job.paramMap.get(-1) }}</td>
                        <td>{{ job.paramMap.get(-3) }}</td>
                        <td>{{ job.paramMap.get(-4) }}</td>
                        </tr>
                    }
                }
            </tbody>
        </table>
    </div>
      <admin-job-page
            [crossJobParams]="crossJobParams()"
            (productSelected)="onProductAdded($event)"
            (crossJobParamsChanged)="onCrossJobParams($event)"
        />

  `,
  styleUrl : './admin-jobs.component.css'
})
export class AdminJobsComponent {

    crossJobParams = signal<CrossJobParameters>({
        paymentReceived : false,
        dueDate: '',
        customer: '',
    })

    // Store all added jobs
    jobs: ProductSelectedWithMap[] = [];

    // Access child job builder to reset after adding
    @ViewChild(AdminJobComponent)
    jobBuilder!: AdminJobComponent;

    // Called when a job is added from AdminJobComponent
    onProductAdded(job: ProductSelected) {

        // Convert params array to a Map for fast lookup
        const paramMap = new Map(
            job.params.map(p => [p.phaseParamId, p.value])
        );

        this.jobs.push({
            ...job,
            paramMap
        });

        this.jobBuilder.reset();
    }

    onCrossJobParams(crossJobParamsChange : CrossJobParameters){
        console.log("JOB PARAM CHANGE :" + JSON.stringify(crossJobParamsChange));
        this.crossJobParams.set(crossJobParamsChange);
    }
}