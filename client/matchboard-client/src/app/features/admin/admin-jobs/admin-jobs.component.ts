import { Component, signal, ViewChild, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
    AdminJobComponent,
    ProductSave,
    PHASE_PARAM_CALLOFF,
    PHASE_PARAM_QUANTITY,
    PHASE_PARAM_MATERIAL,
    PHASE_PARAM_SCHEDULE
} from '../admin-job/admin-job.component';
import {
    CreateJob,
    CreateJobPart,
    CreateJobPartParam,
    CreateJobPartPhase,
    JobService,
    JobStatus,
    JobStatusLabel
} from '../../../core/services/job.service';

export interface ProductSelectedWithMap extends ProductSave {
    paramMap: Map<number, string>;
}

export interface CrossJobParameters {
    jobId: number,
    jobNumber: number,
    paymentReceived: boolean,
    dueDate: string,
    customer: string,
    carrier: string,
    callOff: boolean,
    scheduledOn: string,
    status: number
}

@Component({
    selector: 'admin-jobs',
    standalone: true,
    imports: [CommonModule, AdminJobComponent, DatePipe],
    providers: [DatePipe],
    template: `
    <div>
        <span>
            <strong>Job Number:</strong>
            {{
                crossJobParams().jobNumber > 0
                ? crossJobParams().jobNumber
                : '(New)'
            }}
        </span>
        <span>
            <strong>Due:</strong>
            {{
                crossJobParams().dueDate
                ? (crossJobParams().dueDate | date:'dd/MM/yyyy')
                : '(New)'
            }}
        </span>
        <span>
            <strong>Status:</strong>
            {{ jobStatusLabel(crossJobParams().status) }}
        </span>
    </div>
    <div>
        <table>
            <thead>
                <tr>
                    <th>Part</th>
                    <th>Product</th>
                    <th>Sage Name</th>
                    <th>Quantity</th>
                    <th>From Call Off</th>
                    <th>Schedule</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                @if (jobs().length === 0) {
                    <tr>
                        <td colspan="7">No products added yet</td>
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
                            <td>{{ job.paramMap.get(PHASE_PARAM_QUANTITY_ID) }}</td>
                            <td>{{ job.paramMap.get(PHASE_PARAM_CALLOFF_ID) === 'true' ? 'YES' : 'NO' }}</td>
                            <td>{{ getSchedulableDisplay(job) }}</td>
                            <td>
                                <button type="button" (click)="removePart(job, $event)">-</button>
                            </td>
                        </tr>
                    }
                }
            </tbody>

            <tfoot>
                <tr>
                    <td colspan="7">
                        <button
                            (click)="onSaveJob()"
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

    private jobService = inject(JobService);
    private datePipe = inject(DatePipe);

    PHASE_PARAM_QUANTITY_ID = PHASE_PARAM_QUANTITY.phaseParamId;
    PHASE_PARAM_CALLOFF_ID = PHASE_PARAM_CALLOFF.phaseParamId;
    PHASE_PARAM_MATERIAL_ID = PHASE_PARAM_MATERIAL.phaseParamId;
    PHASE_PARAM_SCHEDULE_ID = PHASE_PARAM_SCHEDULE.phaseParamId;

    crossJobParams = signal<CrossJobParameters>({
        jobId: 0,
        jobNumber: 0,
        paymentReceived: false,
        dueDate: '',
        customer: '',
        carrier: '',
        callOff: false,
        scheduledOn: '',
        status: 0
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
            phases: save.phases,
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

    removePart(job: ProductSelectedWithMap, event: Event) {
        event.stopPropagation();

        this.jobs.update(jobs => jobs.filter(j => j !== job));

        if (this.selectedPart() === job) {
            this.selectedPart.set(null);
            this.jobBuilder.reset();
        }

        if (this.jobs().length === 0) {
            this.crossJobParams.set({
                jobId: 0,
                jobNumber: 0,
                paymentReceived: false,
                dueDate: '',
                customer: '',
                carrier: '',
                callOff: false,
                scheduledOn: '',
                status: 0
            });
        }
    }

    onCrossJobParams(crossJobParamsChange: CrossJobParameters) {
        this.crossJobParams.set(crossJobParamsChange);

        // Update only truly shared fields on existing parts.
        // Keep each part's own schedule untouched.
        this.jobs.update(jobs => jobs.map(job => this.applyCrossJobParamsToPart(job, crossJobParamsChange)));

        const selected = this.selectedPart();
        if (selected) {
            this.selectedPart.set(this.applyCrossJobParamsToPart(selected, crossJobParamsChange));
        }
    }

    private applyCrossJobParamsToPart(
        job: ProductSelectedWithMap,
        cross: CrossJobParameters
    ): ProductSelectedWithMap {
        const params = job.params.map(p => {
            switch (p.phaseParamId) {
                case -2: // payment
                    return { ...p, value: String(cross.paymentReceived) };
                case -3: // call off
                    return { ...p, value: String(cross.callOff) };
                case -5: // due date
                    return { ...p, value: cross.dueDate };
                case -6: // customer
                    return { ...p, value: cross.customer };
                case -7: // carrier
                    return { ...p, value: cross.carrier };
                // IMPORTANT: do not sync -9 schedule here
                default:
                    return p;
            }
        });

        const paramMap = new Map(
            params.map(p => [p.phaseParamId, p.value])
        );

        return {
            ...job,
            params,
            paramMap
        };
    }

    async onSaveJob() {
        if (!this.canSaveJob()) return;

        console.log('Saving job...', {
            crossJobParams: this.crossJobParams(),
            jobs: this.jobs()
        });

        await this.saveJob();
    }

    async saveJob() {
        try {
            const job = await this.jobService.createJob(
                this.createJob(this.crossJobParams(), this.jobs())
            );

            this.crossJobParams.set({
                ...this.crossJobParams(),
                jobId: job.id,
                jobNumber: job.number,
                status: job.status
            });
        } catch (err) {
            console.error('Job save failed', err);
        }
    }

    private createJob(
        crossJobParams: CrossJobParameters,
        jobParts: ProductSelectedWithMap[]
    ): CreateJob {
        return {
            due: new Date(crossJobParams.dueDate).toISOString(),
            customer: Number(crossJobParams.customer),
            carrier: Number(crossJobParams.carrier),
            callOff: crossJobParams.callOff,
            paymentReceived: crossJobParams.paymentReceived,
            parts: jobParts.map((jobPart): CreateJobPart => ({
                productId: jobPart.product.id,
                quantity: Number(jobPart.params.find(i => i.phaseParamId == this.PHASE_PARAM_QUANTITY_ID)!.value),
                fromCallOff: jobPart.params.find(i => i.phaseParamId == this.PHASE_PARAM_CALLOFF_ID)?.value === 'true',
                materialAvailable: jobPart.params.find(i => i.phaseParamId == this.PHASE_PARAM_MATERIAL_ID)?.value === 'true',
                scheduleFor: (() => {
                    const v = jobPart.params.find(i => i.phaseParamId == this.PHASE_PARAM_SCHEDULE_ID)?.value;
                    return v ? new Date(v).toISOString() : null;
                })(),
                phases: jobPart.phases.map((phase): CreateJobPartPhase => ({
                    phaseId: phase.phase.id,
                    specialInstructions: phase.specialInstruction
                })),
                params: jobPart.params.filter(p => p.phaseParamId > 0)
                    .map((param): CreateJobPartParam => ({
                        paramId: param.phaseParamId,
                        phaseNumber: param.phaseNumber,
                        value: param.value
                    }))
            }))
        };
    }

    getSchedulableDisplay(job: ProductSelectedWithMap): string {
        if (!this.crossJobParams().paymentReceived && !this.crossJobParams().callOff) {
            return 'Unpaid';
        }

        const material = job.params.find(p => p.phaseParamId === this.PHASE_PARAM_MATERIAL_ID)?.value;
        if (material !== 'true') {
            return 'Insufficient Material';
        }

        const invalidParams = job.params.filter(
            p => p.input !== 3 &&
                p.phaseParamId !== this.PHASE_PARAM_SCHEDULE_ID &&
                (p.value === '' || p.value.startsWith('('))
        );

        if (invalidParams.length > 0) {
            return invalidParams.map(p => p.key).join(', ') + ' required';
        }

        const scheduledOn = job.params.find(p => p.phaseParamId === this.PHASE_PARAM_SCHEDULE_ID)?.value;
        return scheduledOn
            ? (this.datePipe.transform(scheduledOn, 'dd/MM/yyyy') ?? 'Invalid date')
            : 'Not Scheduled';
    }

    jobStatusLabel(status: JobStatus): string {
        return JobStatusLabel[status];
    }
}