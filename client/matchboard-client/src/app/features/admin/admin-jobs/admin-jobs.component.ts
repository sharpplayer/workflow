import { Component, signal, ViewChild, computed, inject, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
    AdminJobComponent,
    ProductSave,
    PHASE_PARAM_ID_CALLOFF,
    PHASE_PARAM_ID_QUANTITY,
    PHASE_PARAM_ID_MATERIAL,
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
    JobPart,
    JobService,
    JobStatus,
    JobStatusLabel
} from '../../../core/services/job.service';
import { ActivatedRoute } from '@angular/router';
import { PhaseParamSelected } from '../admin-phase-param/admin-phase-param.component';
import { JobPhase } from '../admin-phases-list/admin-phases-list.component';

export interface ProductSelectedWithMap extends ProductSave {
    clientId: string;
    paramMap: Map<number, string>;
    selectedForDelete?: boolean;
}

export interface CrossJobParameters {
    jobId: number,
    jobNumber: number,
    paymentConfirmed: string,
    dueDate: string,
    customer: string,
    carrier: string,
    callOff: boolean,
    status: number
}

@Component({
    selector: 'admin-jobs',
    standalone: true,
    imports: [CommonModule, AdminJobComponent, DatePipe],
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
                    <th>Delete</th>
                    <th>Part</th>
                    <th>Product</th>
                    <th>Sage Name</th>
                    <th>Quantity</th>
                    <th>From Stock</th>
                    <th>Schedule</th>
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
                            [class.marked-for-delete]="job.selectedForDelete"
                        >
                            <td class="select-cell">
                                <input
                                    type="checkbox"
                                    [checked]="!!job.selectedForDelete"
                                    (click)="$event.stopPropagation()"
                                    (change)="togglePartDeleteSelection(job, $any($event.target).checked)"
                                    aria-label="Select job part for deletion"
                                />
                            </td>
                            <td>{{ jobIndex + 1 }}</td>
                            <td>{{ job.product.name }}</td>
                            <td>{{ job.product.oldName }}</td>
                            <td>{{ job.paramMap.get(PHASE_PARAM_ID_QUANTITY) }}</td>
                            <td>{{ job.paramMap.get(PHASE_PARAM_ID_CALLOFF) === 'true' ? 'YES' : 'NO' }}</td>
                            <td>{{ getSchedulableDisplay(job) }}</td>
                        </tr>
                    }
                }
            </tbody>

            <tfoot>
                <tr>
                    <td colspan="7">
                        <button
                            type="button"
                            (click)="deleteSelectedParts()"
                            [disabled]="selectedDeleteCount() === 0"
                        >
                            Delete Selected
                        </button>
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
export class AdminJobsComponent implements OnInit, AfterViewInit {

    PHASE_PARAM_ID_QUANTITY = PHASE_PARAM_ID_QUANTITY;
    PHASE_PARAM_ID_CALLOFF = PHASE_PARAM_ID_CALLOFF;
    private staticParamIds = [
        PHASE_PARAM_ID_QUANTITY,
        PHASE_PARAM_ID_CALLOFF,
        PHASE_PARAM_ID_MATERIAL
    ];

    private jobService = inject(JobService);
    private route = inject(ActivatedRoute);

    crossJobParams = signal<CrossJobParameters>({
        jobId: 0,
        jobNumber: 0,
        paymentConfirmed: '',
        dueDate: '',
        customer: '',
        carrier: '',
        callOff: false,
        status: 0
    });

    jobs = signal<ProductSelectedWithMap[]>([]);
    selectedPart = signal<ProductSelectedWithMap | null>(null);
    private cleanSnapshot = signal<string>('');

    selectedDeleteCount = computed(() =>
        this.jobs().filter(job => job.selectedForDelete).length
    );

    @ViewChild(AdminJobComponent)
    jobBuilder!: AdminJobComponent;

    private dirtySnapshot = computed(() => JSON.stringify({
        crossJobParams: this.crossJobParams(),
        jobs: this.jobs().map(job => ({
            productId: job.product.id,
            params: job.params,
            phases: job.phases
        })),
        selectedPartClientId: this.selectedPart()?.clientId ?? null,
        builderDirty: this.jobBuilder?.hasUnsavedChanges?.() ?? false
    }));

    ngAfterViewInit(): void {
        if (this.crossJobParams().jobId === 0 && this.jobs().length === 0) {
            queueMicrotask(() => this.markClean());
        }
    }

    isDirty(): boolean {
        return this.dirtySnapshot() !== this.cleanSnapshot();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent): void {
        if (!this.isDirty()) return;

        event.preventDefault();
        event.returnValue = '';
    }

    private markClean(): void {
        this.cleanSnapshot.set(this.dirtySnapshot());
    }

    private canDiscardBuilderChanges(): boolean {
        return !this.jobBuilder?.hasUnsavedChanges?.()
            || confirm('You have unsaved changes. Continue without saving them?');
    }


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
                paymentConfirmed: job.paymentConfirmed ? this.toDateInputValue(job.paymentConfirmed) : '',
                dueDate: job.due ? this.toDateInputValue(job.due) : '',
                customer: String(job.customer),
                carrier: String(job.carrier),
                callOff: job.callOff,
                status: job.status
            });

            this.jobs.set(job.parts.map(part => this.mapJobPartToSelected(part)));
            this.selectedPart.set(null);
            queueMicrotask(() => this.markClean());
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
                input: p.input,
                phaseUsage: part.phases.find(ph => p.phaseId === ph.phaseId)?.phaseUsage ?? 0
            })),

            ...this.staticParamIds.map((id): PhaseParamSelected => {
                const base = PHASE_PARAM_MAP.get(id)!;

                return {
                    phaseId: 0,
                    phaseParamId: id,
                    phaseNumber: 0,
                    key: base.paramName,
                    value: this.getValueByParamId(id, part),
                    input: base.input,
                    phaseUsage: 0
                };
            })
        ];

        const paramMap = new Map(
            params.map((p: any) => [p.phaseParamId, p.value])
        );

        console.log("PACK SIZE:" + part.packSize);

        return {
            clientId: this.createId(),
            mode: 'update',
            product: {
                id: part.productId,
                name: part.name,
                oldName: part.oldName,
                enabled: true,
                machineIds: part.machineIds ?? [],
                packSize: part.packSize
            },
            params,
            phases: (part.phases ?? []).map((phase): JobPhase => ({
                phase: {
                    id: phase.phaseId,
                    order: 1,
                    params: [],
                    description: '',
                    usage: 0,
                    machineIds: null
                },
                specialInstruction: phase.specialInstructions ?? '',
                order: 1
            })),
            paramMap,
            selectedForDelete: false
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
            paramMap,
            selectedForDelete: false
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
        if (!this.canDiscardBuilderChanges()) return;

        this.selectedPart.set(job);
    }

    togglePartDeleteSelection(job: ProductSelectedWithMap, checked: boolean): void {
        this.jobs.update(jobs =>
            jobs.map(j => (j.clientId === job.clientId ? { ...j, selectedForDelete: checked } : j))
        );
    }

    deleteSelectedParts(): void {
        if (!this.canDiscardBuilderChanges()) return;

        const selectedIds = new Set(
            this.jobs()
                .filter(job => job.selectedForDelete)
                .map(job => job.clientId)
        );

        if (selectedIds.size === 0) return;

        this.jobs.update(jobs => jobs.filter(job => !selectedIds.has(job.clientId)));

        if (selectedIds.has(this.selectedPart()?.clientId ?? '')) {
            this.selectedPart.set(null);
            this.jobBuilder.reset();
        }

        if (this.jobs().length === 0) {
            this.crossJobParams.set({
                jobId: 0,
                jobNumber: 0,
                paymentConfirmed: '',
                dueDate: '',
                customer: '',
                carrier: '',
                callOff: false,
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
                    return { ...p, value: cross.paymentConfirmed };
                case PHASE_PARAM_ID_CALLOFF:
                    return { ...p, value: String(cross.callOff) };
                case PHASE_PARAM_ID_DUE_DATE:
                    return { ...p, value: cross.dueDate };
                case PHASE_PARAM_ID_CUSTOMER:
                    return { ...p, value: cross.customer };
                case PHASE_PARAM_ID_CARRIER:
                    return { ...p, value: cross.carrier };
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

        if (this.jobBuilder?.hasUnsavedChanges?.()) {
            alert('Please add/update or cancel the current part before saving the job.');
            return;
        }

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

            queueMicrotask(() => this.markClean());
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
            paymentConfirmed: crossJobParams.paymentConfirmed ? new Date(crossJobParams.paymentConfirmed).toISOString() : null,
            parts: jobParts.map((jobPart): CreateJobPart => ({
                productId: jobPart.product.id,
                quantity: Number(jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_QUANTITY)!.value),
                fromCallOff: jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_CALLOFF)?.value === 'true',
                materialAvailable: jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_MATERIAL)?.value === 'true',
                phases: jobPart.phases.map((phase): CreateJobPartPhase => ({
                    phaseId: phase.phase.id,
                    specialInstructions: phase.specialInstruction
                })),
                params: jobPart.params
                    .filter(p => p.phaseParamId > 0)
                    .flatMap((param): CreateJobPartParam[] => {
                        const usesProductPack = (param.phaseUsage & 16) !== 0;

                        if (!usesProductPack) {
                            return [{
                                paramId: param.phaseParamId,
                                phaseNumber: param.phaseNumber,
                                value: param.value,
                                pack: null
                            }];
                        }

                        const packCount = Math.floor(Number(jobPart.params.find(i => i.phaseParamId == PHASE_PARAM_ID_QUANTITY)!.value) / jobPart.product.packSize) + 1;

                        return Array.from({ length: packCount }, (_, i): CreateJobPartParam => ({
                            paramId: param.phaseParamId,
                            phaseNumber: param.phaseNumber,
                            value: param.value,
                            pack: i + 1
                        }));
                    })
            }))
        };
    }

    getSchedulableDisplay(job: ProductSelectedWithMap): string {
        if (!this.crossJobParams().paymentConfirmed && !this.crossJobParams().callOff) {
            return 'Unpaid';
        }

        const material = job.params.find(p => p.phaseParamId === PHASE_PARAM_ID_MATERIAL)?.value;
        if (material !== 'true') {
            return 'Insufficient Material';
        }

        const invalidParams = job.params.filter(
            p => p.input !== 3 &&
                (p.value === '' || p.value.startsWith('('))
        );

        if (invalidParams.length > 0) {
            return invalidParams.map(p => p.key).join(', ') + ' required';
        }

        return "Schedulable";
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
