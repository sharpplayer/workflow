import { Component, signal, ViewChild, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
    imports: [CommonModule, AdminJobComponent, DatePipe],
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
                    <th>Schedulable</th>
                </tr>
            </thead>

            <tbody>
                @if (jobs().length === 0) {
                    <tr>
                        <td colspan="6">No products added yet</td>
                    </tr>
                } @else {
                    @for (job of jobs(); track $index; let jobIndex = $index) {
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
                            <td>{{ getSchedulableDisplay(job) }}</td>
                        </tr>
                    }
                }
            </tbody>

            <tfoot>
                <tr>
                    <td colspan="5">
                        <span>
                        <strong>Due:</strong>
                        {{
                            crossJobParams().dueDate
                            ? (crossJobParams().dueDate | date:'dd/MM/yyyy')
                            : '(Unknown)'
                        }}
                        </span>
                    </td>
                    <td colspan="2">
                        <button
                            (click)="scheduleJob()"
                            [disabled]="!canScheduleJob()"
                        >
                            Schedule Job
                        </button>

                        <button
                            (click)="saveJob()"
                            [disabled]="!canSaveJob()"
                        >
                            Save Job
                        </button>
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>

    <admin-job-page
        [crossJobParams]="crossJobParams()"
        [selectedPart]="selectedPart()"
        (productSave)="onProductSave($event)"
        (crossJobParamsChanged)="onCrossJobParams($event)"
        (cancel)="onCancel()"
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

    jobs = signal<ProductSelectedWithMap[]>([]);
    selectedPart = signal<ProductSelectedWithMap | null>(null);

    @ViewChild(AdminJobComponent)
    jobBuilder!: AdminJobComponent;

    canScheduleJob = computed(() => {
        const jobs = this.jobs();
        const selected = this.selectedPart();
        const params = this.crossJobParams();

        if (jobs.length === 0) return false;
        if (selected) return false;
        if (!params.customer) return false;
        if (!params.dueDate) return false;

        const undefinedParams = this.jobs().flatMap(j =>
            j.params.filter(p => p.input !== 3 && (p.value == '' || p.value.startsWith('(')))
        );
        return undefinedParams.length == 0;
    });

    canSaveJob = computed(() => {
        const jobs = this.jobs();
        const selected = this.selectedPart();

        console.log("S:" + selected)

        if (jobs.length === 0) return false;
        if (selected) return false;
        return true;
    });

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

        const originalPart = this.selectedPart();

        if (save.mode === 'update' && originalPart) {
            this.jobs.update(jobs => {
                const index = jobs.findIndex(j => j === originalPart);

                if (index === -1) {
                    console.warn('Original part not found, adding instead');
                    return [...jobs, updatedPart];
                }

                const next = [...jobs];
                next[index] = updatedPart;
                return next;
            });
        } else {
            this.jobs.update(jobs => [...jobs, updatedPart]);
        }

        console.log("J:" + JSON.stringify(this.jobs()));

        this.selectedPart.set(null);
        this.jobBuilder.reset();
    }

    onCancel() {
        this.selectedPart.set(null);
        this.jobBuilder.reset();
    }

    selectPart(job: ProductSelectedWithMap) {
        this.selectedPart.set(job);
    }

    onCrossJobParams(crossJobParamsChange: CrossJobParameters) {
        this.crossJobParams.set(crossJobParamsChange);
    }

    scheduleJob() {
        if (!this.canScheduleJob()) return;

        console.log('Scheduling job...', {
            crossJobParams: this.crossJobParams(),
            jobs: this.jobs()
        });
    }

    saveJob() {
        if (!this.canSaveJob()) return;

        console.log('Saving job...', {
            crossJobParams: this.crossJobParams(),
            jobs: this.jobs()
        });
    }

    getSchedulableDisplay(job: ProductSelectedWithMap): string {

        if(!this.crossJobParams().paymentReceived) {
            return 'Unpaid';
        }

        const invalidParams = job.params.filter(
            p => p.input !== 3 && (p.value === '' || p.value.startsWith('('))
        );

        console.log("S:" + JSON.stringify(invalidParams));

        if (invalidParams.length === 0) {
            return 'YES';
        }

        return invalidParams.map(p => p.key).join(', ') + " required";
    }
}