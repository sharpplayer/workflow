import { Component, signal, ViewChild, computed, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
    AdminJobComponent,
    ProductSave,
    PHASE_PARAM_ID_CALLOFF,
    PHASE_PARAM_ID_QUANTITY,
    PHASE_PARAM_ID_MATERIAL,
    PHASE_PARAM_ID_SCHEDULE,
    PHASE_PARAM_ID_PAYMENT,
    PHASE_PARAM_ID_DUE_DATE,
    PHASE_PARAM_ID_CUSTOMER,
    PHASE_PARAM_ID_CARRIER,
    PHASE_PARAM_MAP
} from '../admin-job/admin-job.component';
import {
    CreateJob,
    CreateJobPart,
    CreateJobPartParam,
    CreateJobPartPhase,
    Job,
    JobPart,
    JobService,
    JobStatus,
    JobStatusLabel
} from '../../../core/services/job.service';
import { ActivatedRoute } from '@angular/router';
import { PhaseParam } from '../../../core/services/product.service';
import { PhaseParamSelected } from '../admin-phase-param/admin-phase-param.component';
import { JobPhase } from '../admin-phases-list/admin-phases-list.component';

export interface ProductSelectedWithMap extends ProductSave {
    clientId: string;
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
            <strong>Job Ref:</strong>
            {{
                getJobRef()
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
        <span>
            <strong>Job Number:</strong>
            {{
                crossJobParams().jobNumber > 0
                ? crossJobParams().jobNumber
                : '(New)'
            }}
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
                    @for (job of jobs(); track job.clientId; let jobIndex = $index)
                    {
                        <tr
                            (click)="selectPart(job)"
                            [class.selected]="selectedPart()?.clientId === job.clientId"
                        >
                            <td>{{ jobIndex + 1 }}</td>
                            <td>{{ job.product.name }}</td>
                            <td>{{ job.product.oldName }}</td>
                            <td>{{ job.paramMap.get(PHASE_PARAM_ID_QUANTITY) }}</td>
                            <td>{{ job.paramMap.get(PHASE_PARAM_ID_CALLOFF) === 'true' ? 'YES' : 'NO' }}</td>
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
export class AdminJobsComponent implements OnInit {

    PHASE_PARAM_ID_QUANTITY = PHASE_PARAM_ID_QUANTITY;
    PHASE_PARAM_ID_CALLOFF = PHASE_PARAM_ID_CALLOFF;
    private staticParamIds = [
        PHASE_PARAM_ID_QUANTITY,
        PHASE_PARAM_ID_CALLOFF,
        PHASE_PARAM_ID_MATERIAL,
        PHASE_PARAM_ID_SCHEDULE
    ];

    private jobService = inject(JobService);
    private datePipe = inject(DatePipe);
    private route = inject(ActivatedRoute);

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

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        const jobId = idParam ? Number(idParam) : 0;

        if (jobId > 0) {
            void this.loadJob(jobId);
        }
    }

    async loadJob(jobId: number) {
        try {
            const job = await this.jobService.getJob(jobId);

            this.crossJobParams.set({
                jobId: job.id,
                jobNumber: job.number,
                paymentReceived: job.paymentReceived,
                dueDate: job.due ? this.toDateInputValue(job.due) : '',
                customer: String(job.customer),
                carrier: String(job.carrier),
                callOff: job.callOff,
                scheduledOn: '',
                status: job.status
            });

            this.jobs.set(job.parts.map(part => this.mapJobPartToSelected(part)));
            this.selectedPart.set(null);
        } catch (err) {
            console.error('Failed to load job', err);
        }
    }

    private mapJobPartToSelected(part: JobPart): ProductSelectedWithMap {
        const params = [
            ...(part.params ?? []).map((p): PhaseParamSelected => ({
                phaseId: p.partPhaseId,
                phaseParamId: p.partParamId,
                phaseNumber: p.phaseNumber,
                value: p.value || '',
                key: p.name,
                input: p.input
            })),

            ...this.staticParamIds.map((id): PhaseParamSelected => {
                const base = PHASE_PARAM_MAP.get(id)!;

                return {
                    phaseId: 0,
                    phaseParamId: id,
                    phaseNumber: 0,
                    key: base.paramName,
                    value: this.getValueByParamId(id, part),
                    input: base.input
                };
            })
        ];

        const paramMap = new Map(
            params.map((p: any) => [p.phaseParamId, p.value])
        );

        return {
            clientId: this.createId(),
            mode: 'update',
            product: {
                id: part.productId,
                name: part.name,
                oldName: part.oldName,
                enabled: true
            },
            params,
            phases: (part.phases ?? []).map((phase): JobPhase => ({
                phase: {
                    id: phase.phaseId,
                    order: 1,
                    params: [],
                    description: ''
                },
                specialInstruction: phase.specialInstructions ?? '',
                order: 1
            })),
            paramMap
        };
    }

    getValueByParamId(id: number, part: any): string {
        switch (id) {
            case PHASE_PARAM_ID_QUANTITY:
                return String(part.quantity ?? '');

            case PHASE_PARAM_ID_CALLOFF:
                return String(part.fromCallOff ?? false);

            case PHASE_PARAM_ID_MATERIAL:
                return String(part.materialAvailable ?? false);

            case PHASE_PARAM_ID_SCHEDULE:
                return part.scheduleFor
                    ? this.toDateInputValue(part.scheduleFor)
                    : '';

            default:
                return '';
        }
    };

    private toDateInputValue(value: string | Date): string {
        const d = new Date(value);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

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

        const originalPart = this.selectedPart();

        const updatedPart: ProductSelectedWithMap = {
            clientId: originalPart?.clientId ?? this.createId(),
            mode: save.mode,
            product: save.product,
            params: save.params,
            phases: save.phases,
            paramMap
        };

        if (save.mode === 'update' && originalPart) {
            this.jobs.update(jobs => {
                const index = jobs.findIndex(j => j.clientId === originalPart.clientId);

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

        this.jobs.update(jobs => jobs.filter(j => j.clientId !== job.clientId));

        if (this.selectedPart()?.clientId === job.clientId) {
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
                case PHASE_PARAM_ID_PAYMENT:
                    return { ...p, value: String(cross.paymentReceived) };
                case PHASE_PARAM_ID_CALLOFF: // call off
                    return { ...p, value: String(cross.callOff) };
                case PHASE_PARAM_ID_DUE_DATE:
                    return { ...p, value: cross.dueDate };
                case PHASE_PARAM_ID_CUSTOMER:
                    return { ...p, value: cross.customer };
                case PHASE_PARAM_ID_CARRIER:
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
                quantity: Number(jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_QUANTITY)!.value),
                fromCallOff: jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_CALLOFF)?.value === 'true',
                materialAvailable: jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_MATERIAL)?.value === 'true',
                scheduleFor: (() => {
                    const v = jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_SCHEDULE)?.value;
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

        const material = job.params.find(p => p.phaseParamId === PHASE_PARAM_ID_MATERIAL)?.value;
        if (material !== 'true') {
            return 'Insufficient Material';
        }

        const invalidParams = job.params.filter(
            p => p.input !== 3 &&
                p.phaseParamId !== PHASE_PARAM_ID_SCHEDULE &&
                (p.value === '' || p.value.startsWith('('))
        );

        if (invalidParams.length > 0) {
            return invalidParams.map(p => p.key).join(', ') + ' required';
        }

        const scheduledOn = job.params.find(p => p.phaseParamId === PHASE_PARAM_ID_SCHEDULE)?.value;
        return scheduledOn
            ? (this.datePipe.transform(scheduledOn, 'dd/MM/yyyy') ?? 'Invalid date')
            : 'Not Scheduled';
    }

    jobStatusLabel(status: JobStatus): string {
        return JobStatusLabel[status];
    }

    private createId(): string {
        return crypto.randomUUID();
    }

    getJobRef() {
        return this.crossJobParams().jobNumber > 0
            ? this.jobService.getJobRef(this.crossJobParams().jobNumber)
            : '(New)'
    }
}