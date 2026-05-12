import { Component, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam, ProductView } from '../../../core/services/product.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';
import { AdminProductListComponent } from '../admin-products-list/admin-products-list.component';
import { AdminPhasesListComponent, JobPhase, PhasesSelected } from '../admin-phases-list/admin-phases-list.component';
import {
    AdminPhaseParamComponent,
    PhaseParamData,
    PhaseParamSelected,
    PhaseParamValidationError
} from '../admin-phase-param/admin-phase-param.component';
import { CrossJobParameters } from '../admin-jobs/admin-jobs.component';
import { ParamStatus } from '../../../core/services/job.service';

export interface ProductSave {
    mode: 'add' | 'update';
    product: ProductView;
    phases: JobPhase[];
    params: PhaseParamSelected[];
}

export const PHASE_PARAM_ID_QUANTITY = -1;
export const PHASE_PARAM_ID_PAYMENT = -2;
export const PHASE_PARAM_ID_CALLOFF = -3;
export const PHASE_PARAM_ID_FINISHED = -4;
export const PHASE_PARAM_ID_DUE_DATE = -5;
export const PHASE_PARAM_ID_CUSTOMER = -6;
export const PHASE_PARAM_ID_CARRIER = -7;
export const PHASE_PARAM_ID_MATERIAL = -8;

export const PHASE_PARAM_QUANTITY: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_QUANTITY,
    phaseNumber: 0,
    paramName: 'Quantity',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'int',
    optional: false
};

const PHASE_PARAM_PAYMENT: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_PAYMENT,
    phaseNumber: 0,
    paramName: 'Payment Confirmed',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Start)',
    type: 'date',
    value: '',
    optional: true
};

export const PHASE_PARAM_CALLOFF: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_CALLOFF,
    phaseNumber: 0,
    paramName: 'Call Off Stock Order',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean',
    value: 'false',
    optional: false
};

const PHASE_PARAM_FINISHED: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_FINISHED,
    phaseNumber: 0,
    paramName: 'Allocate From Stock',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean',
    value: 'false',
    optional: false
};

const PHASE_PARAM_DUE_DATE: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_DUE_DATE,
    phaseNumber: 0,
    paramName: 'Due',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'date',
    optional: false
};

const PHASE_PARAM_CUSTOMER: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_CUSTOMER,
    phaseNumber: 0,
    paramName: 'Customer',
    paramConfig: 'customer',
    input: 1,
    evaluation: '(Select)',
    type: 'string[]',
    searchable: true,
    editable: false,
    optional: true
};

const PHASE_PARAM_CARRIER: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_CARRIER,
    phaseNumber: 0,
    paramName: 'Carrier',
    paramConfig: 'carrier',
    input: 1,
    evaluation: '(Select For Non Call Off)',
    type: 'string[]',
    searchable: true,
    editable: true,
    optional: true
};

export const PHASE_PARAM_MATERIAL: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_MATERIAL,
    phaseNumber: 0,
    paramName: 'Material Available',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean',
    value: 'true',
    optional: false
};

export const PHASE_PARAM_MAP: Map<number, PhaseParam> = new Map([
    [PHASE_PARAM_ID_QUANTITY, PHASE_PARAM_QUANTITY],
    [PHASE_PARAM_ID_PAYMENT, PHASE_PARAM_PAYMENT],
    [PHASE_PARAM_ID_CALLOFF, PHASE_PARAM_CALLOFF],
    [PHASE_PARAM_ID_FINISHED, PHASE_PARAM_FINISHED],
    [PHASE_PARAM_ID_DUE_DATE, PHASE_PARAM_DUE_DATE],
    [PHASE_PARAM_ID_CUSTOMER, PHASE_PARAM_CUSTOMER],
    [PHASE_PARAM_ID_CARRIER, PHASE_PARAM_CARRIER],
    [PHASE_PARAM_ID_MATERIAL, PHASE_PARAM_MATERIAL],
]);

@Component({
    selector: 'admin-job-page',
    standalone: true,
    imports: [
        CommonModule,
        AdminProductListComponent,
        AdminPhasesListComponent,
        AdminPhaseParamComponent
    ],
    template: `
        <div class="jobs-container">
            <admin-products-list
                #productsList
                [selectedProductInput]="selectedPart()?.product ?? null"
                [locked]="!!selectedPart()"
                (productSelected)="onProductSelected($event)"
                (hasResults)="hasResults = $event"
                (selectionCleared)="manualSelectedProduct.set(null)"
            />

            @if ((selectedPart()?.product ?? manualSelectedProduct()) && hasResults) {
                <admin-phases-list
                    [productId]="(selectedPart()?.product ?? manualSelectedProduct())!.id"
                    [machineFilter]="(selectedPart()?.product ?? manualSelectedProduct())!.machineIds"
                    (phasesSelected)="phaseSelected($event)"
                />

                <admin-phase-param
                    [phaseParams]="phaseParamsToShow()"
                    [validationErrors]="validationErrors()"
                    (paramsSelected)="paramsSelected($event)"
                />

                <div class="actions">
                    <button (click)="cancelAdd()">Cancel</button>
                    <button [disabled]="!canAddProduct()" (click)="addProduct()">
                        {{ buttonText() }}
                    </button>
                </div>
            }
        </div>
    `,
    styleUrls: ['./admin-job.component.css']
})
export class AdminJobComponent {
    private configService = inject(ConfigService);

    manualSelectedProduct = signal<ProductView | null>(null);
    phaseParamsToShow = signal<PhaseParamData[]>([]);
    selectedPhases = signal<JobPhase[]>([]);
    lastParamsSelected = signal<PhaseParamSelected[] | null>(null);
    validationErrors = signal<PhaseParamValidationError[]>([]);

    productSave = output<ProductSave>();
    cancel = output<void>();
    crossJobParamsChanged = output<CrossJobParameters>();
    private cleanSnapshot = signal<string>('');
    private pendingEditHydration = false;

    private editSnapshot = computed(() => JSON.stringify({
        productId: this.effectiveSelectedProduct()?.id ?? null,
        phaseIds: this.selectedPhases().map(p => p.phase.id),
        params: this.lastParamsSelected() ?? []
    }));

    hasUnsavedChanges(): boolean {
        return this.editSnapshot() !== this.cleanSnapshot();
    }

    hasPendingChanges(): boolean {
        const params = this.lastParamsSelected();
        if (!params || this.getValidationErrors(params).length > 0) return false;

        return this.hasUnsavedChanges();
    }

    private markClean(): void {
        this.cleanSnapshot.set(this.editSnapshot());
    }

    hasResults = true;

    crossJobParams = input<CrossJobParameters>({
        jobId: 0,
        jobNumber: 0,
        paymentConfirmed: '',
        dueDate: '',
        customer: '',
        carrier: '',
        callOff: false,
        status: 0
    });

    selectedPart = input<ProductSave | null>(null);

    effectiveSelectedProduct = computed(() => {
        const part = this.selectedPart();
        return part ? part.product : this.manualSelectedProduct();
    });

    hasSelectedPhases = computed(() => this.selectedPhases().length > 0);
    isEditing = computed(() => !!this.selectedPart());
    buttonText = computed(() => this.isEditing() ? 'Update Job Part' : 'Add Job Part');

    @ViewChild('productsList') productsList!: AdminProductListComponent;

    canAddProduct = computed(() => {
        if (!this.hasSelectedPhases()) return false;

        const params = this.lastParamsSelected();
        if (!params) return false;

        if (this.getValidationErrors(params).length > 0) return false;

        return !this.isEditing() || this.hasUnsavedChanges();
    });

    constructor() {
        queueMicrotask(() => this.markClean());

        effect(() => {
            const job = this.selectedPart();
            if (!job) return;

            this.loadJob(job);
        });

        effect(() => {
            const params = this.lastParamsSelected();

            if (!params) {
                this.validationErrors.set([]);
                return;
            }

            this.validationErrors.set(this.getValidationErrors(params));
        });
    }

    async onProductSelected(product: ProductView): Promise<void> {
        if (this.effectiveSelectedProduct()?.id === product.id) return;
        if (!this.canDiscardChanges()) return;

        this.manualSelectedProduct.set(product);
        this.phaseParamsToShow.set([]);
        this.selectedPhases.set([]);
        this.lastParamsSelected.set(null);
    }

    async phaseSelected(phases: PhasesSelected): Promise<void> {
        this.selectedPhases.set(phases.phases);

        const cross = this.crossJobParams();
        const selected = this.selectedPart();

        const paymentParam: PhaseParam = { ...PHASE_PARAM_PAYMENT, value: cross.paymentConfirmed };
        const dateParam: PhaseParam = { ...PHASE_PARAM_DUE_DATE, value: cross.dueDate };
        const customerParam: PhaseParam = { ...PHASE_PARAM_CUSTOMER, value: cross.customer };
        const carrierParam: PhaseParam = { ...PHASE_PARAM_CARRIER, value: cross.carrier };
        const callOffParam: PhaseParam = { ...PHASE_PARAM_CALLOFF, value: cross.callOff ? 'true' : 'false' };

        const params: PhaseParam[] = [
            dateParam,
            paymentParam,
            callOffParam,
            customerParam,
            carrierParam,
            PHASE_PARAM_QUANTITY,
            ...phases.params,
            PHASE_PARAM_FINISHED,
            PHASE_PARAM_MATERIAL
        ];

        let jobPartParams: PhaseParamSelected[] | null = null;

        if (selected && selected.product.id === this.effectiveSelectedProduct()?.id) {
            const crossJobParamValueMap = new Map<number, string>([
                [paymentParam.phaseParamId, paymentParam.value ?? ''],
                [dateParam.phaseParamId, dateParam.value ?? ''],
                [customerParam.phaseParamId, customerParam.value ?? ''],
                [carrierParam.phaseParamId, carrierParam.value ?? ''],
                [callOffParam.phaseParamId, callOffParam.value ?? '']
            ]);

            jobPartParams = selected.params.map(p => ({
                ...p,
                value: crossJobParamValueMap.get(p.phaseParamId) ?? p.value
            }));
        }

        console.log(params)
        console.log(jobPartParams)

        const rows = await this.buildPhaseParamRows(phases.phases, params, jobPartParams);

        this.phaseParamsToShow.set(rows);

        this.lastParamsSelected.set(
            rows.map(row => this.toSelectedParam(row))
        );

        if (this.pendingEditHydration) {
            this.pendingEditHydration = false;
            queueMicrotask(() => this.markClean());
        }
    }

    paramsSelected(params: PhaseParamSelected[]): void {
        this.lastParamsSelected.set(params);

        const errors = this.getValidationErrors(params);
        if (errors.length > 0) {
            return;
        }

        const current = this.crossJobParams();

        const paymentParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_PAYMENT)?.value ?? '';
        const dueDateParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_DUE_DATE)?.value ?? '';
        const customerParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_CUSTOMER)?.value ?? '';
        const carrierParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_CARRIER)?.value ?? '';
        const callOffParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_CALLOFF)?.value === 'true';

        const newValue: CrossJobParameters = {
            jobId: current.jobId,
            jobNumber: current.jobNumber,
            paymentConfirmed: paymentParam,
            dueDate: dueDateParam,
            customer: customerParam,
            carrier: carrierParam,
            callOff: callOffParam,
            status: current.status
        };

        const hasChanged =
            newValue.paymentConfirmed !== current.paymentConfirmed ||
            newValue.dueDate !== current.dueDate ||
            newValue.customer !== current.customer ||
            newValue.carrier !== current.carrier ||
            newValue.callOff !== current.callOff;

        if (hasChanged) {
            this.crossJobParamsChanged.emit(newValue);
        }
    }

    addProduct(): void {
        const product = this.effectiveSelectedProduct();
        const params = this.lastParamsSelected()?.slice() ?? [];

        if (!product) {
            console.error('No product selected!');
            return;
        }

        const errors = this.getValidationErrors(params);

        if (errors.length > 0) {
            console.error('Invalid params detected:', errors);
            return;
        }

        this.productSave.emit({
            mode: this.isEditing() ? 'update' : 'add',
            product,
            phases: this.selectedPhases(),
            params
        });

        this.productsList.clearFilter();
        this.reset();
    }

    cancelAdd(): void {
        this.cancel.emit();
        this.productsList.clearFilter();
        this.reset();
    }

    private loadJob(job: ProductSave): void {
        this.pendingEditHydration = true;
        this.selectedPhases.set([...job.phases]);
        this.lastParamsSelected.set(job.params.map(p => ({ ...p })));
    }

    private canDiscardChanges(): boolean {
        return !this.hasUnsavedChanges()
            || confirm('You have unsaved changes. Continue without saving them?');
    }

    private async buildPhaseParamRows(
        phases: JobPhase[],
        params: PhaseParam[],
        jobPartParams: PhaseParamSelected[] | null
    ): Promise<PhaseParamData[]> {
        const selectedMap = new Map(
            (jobPartParams ?? []).map(p => [p.phaseParamId, p.value])
        );

        const filtered = params.filter(p => this.isWrappedEvaluation(p));
        const result: PhaseParamData[] = [];

        for (const p of filtered) {
            let options: ConfigItem[] = [];
            let type = p.type ?? null;
            let def = '';

            if (p.paramConfig && !this.isPrimitive(p.paramConfig)) {
                if (p.paramConfig.startsWith('CHECK(')) {
                    def = p.paramConfig.substring(6, p.paramConfig.length - 1);
                    type = 'check';
                } else {
                    try {
                        const list = await this.configService.getList(p.paramConfig);
                        options = list.value;

                        if (p.input === 1 && options.length > 0 && !p.optional) {
                            def = options[0].key;
                        }
                    } catch (err) {
                        console.error(`Failed to load list for ${p.paramName} because config is ${p.paramConfig} type is ${p.type}`, err);
                    }
                }
            }

            const defaults: ConfigItem[] = [];

            const value = selectedMap.get(p.phaseParamId) ?? p.value ?? def;

            const finalOptions = [...options];

            if (
                value &&
                !finalOptions.some(o => o.key === value) &&
                !defaults.some(d => d.key === value)
            ) {
                finalOptions.unshift({ key: value, value });
            }

            result.push({
                phaseId: p.phaseId,
                phaseParamId: p.phaseParamId,
                phaseNumber: p.phaseNumber,
                key: p.paramName,
                value,
                paramConfig: p.paramConfig,
                type,
                options: [...defaults, ...finalOptions],
                input: p.input,
                searchable: p.searchable ?? false,
                editable: p.editable ?? false,
                optional: p.optional ?? false,
                status: type === 'check' ? ParamStatus.INITIALISED : ParamStatus.MATCHING,
                phaseUsage: phases.find(ph => ph.phase.id === p.phaseId)?.phase.usage ?? 0
            });
        }

        return result;
    }

    private toSelectedParam(param: PhaseParamData): PhaseParamSelected {
        return {
            phaseId: param.phaseId,
            phaseParamId: param.phaseParamId,
            phaseNumber: param.phaseNumber,
            key: param.key,
            value: param.value,
            input: param.input,
            phaseUsage: param.phaseUsage
        };
    }

    private isWrappedEvaluation(evaluation: PhaseParam): boolean {
        return evaluation.input === 1 && !!evaluation.evaluation &&
            evaluation.evaluation.trim().startsWith('(') &&
            evaluation.evaluation.trim().endsWith(')');
    }

    private getValidationErrors(params: PhaseParamSelected[]): PhaseParamValidationError[] {
        const errors: PhaseParamValidationError[] = [];

        const quantityParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_QUANTITY);
        if (quantityParam && (!/^\d+$/.test(quantityParam.value) || Number(quantityParam.value) <= 0)) {
            errors.push({
                phaseParamId: quantityParam.phaseParamId,
                message: 'Quantity must be a whole number greater than 0.'
            });
        }

        const dueDateParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_DUE_DATE);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dueDateParam) {
            const selected = new Date(dueDateParam.value);

            if (isNaN(selected.getTime())) {
                errors.push({
                    phaseParamId: dueDateParam.phaseParamId,
                    message: 'Please enter a valid due date.'
                });
            } else if (this.crossJobParams().jobId === 0 && selected < today) {
                errors.push({
                    phaseParamId: dueDateParam.phaseParamId,
                    message: 'Due date cannot be in the past.'
                });
            }
        }

        const callOffParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_CALLOFF);
        const isCallOff = callOffParam?.value === 'true';

        const customerParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_CUSTOMER);
        if (customerParam) {
            const customerValue = Number(customerParam.value);

            if (isCallOff && customerValue > 0) {
                errors.push({
                    phaseParamId: customerParam.phaseParamId,
                    message: 'Customer must not be selected for call off jobs.'
                });
            }

            if (!isCallOff && customerValue <= 0) {
                errors.push({
                    phaseParamId: customerParam.phaseParamId,
                    message: 'Please select a customer.'
                });
            }
        }

        const paidParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_PAYMENT);
        const hasPaymentDate = !!paidParam?.value;

        if (isCallOff && hasPaymentDate && paidParam) {
            errors.push({
                phaseParamId: paidParam.phaseParamId,
                message: 'Payment should not be received for call off jobs.'
            });
        }

        const carrierParam = params.find(p => p.phaseParamId === PHASE_PARAM_ID_CARRIER);
        if (carrierParam) {
            const carrierValue = Number(carrierParam.value);

            if (isCallOff && carrierValue > 0) {
                errors.push({
                    phaseParamId: carrierParam.phaseParamId,
                    message: 'Carrier must not be selected for call off jobs.'
                });
            }

            if (!isCallOff && carrierValue <= 0) {
                errors.push({
                    phaseParamId: carrierParam.phaseParamId,
                    message: 'Please select a carrier.'
                });
            }
        }

        const emptyParams = params.filter(
            p => p.phaseParamId > 0 && p.input === 1 && !p.value
        );

        emptyParams.forEach(emptyParam => {
            errors.push({
                phaseParamId: emptyParam.phaseParamId,
                message: 'Please specify.'
            });
        });

        return errors;
    }

    reset(): void {
        this.manualSelectedProduct.set(null);
        this.selectedPhases.set([]);
        this.phaseParamsToShow.set([]);
        this.lastParamsSelected.set(null);
        this.validationErrors.set([]);
        this.hasResults = true;
        this.pendingEditHydration = false;
        this.markClean();
    }

    isPrimitive(config: string) {
        const normalized = config.toLowerCase();
        return normalized === 'photo' ||
            normalized === 'string' ||
            normalized === 'string[]' ||
            normalized === 'int' ||
            normalized === 'float' ||
            normalized === 'boolean';
    }
}
