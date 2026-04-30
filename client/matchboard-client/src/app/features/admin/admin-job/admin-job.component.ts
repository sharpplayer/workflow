import { Component, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam, ProductView } from '../../../core/services/product.service';
import { ConfigService } from '../../../core/services/config.service';
import { AdminProductListComponent } from '../admin-products-list/admin-products-list.component';
import { AdminPhasesListComponent, JobPhase, PhasesSelected } from '../admin-phases-list/admin-phases-list.component';
import { AdminPhaseParamComponent, PhaseParamSelected, PhaseParamValidationError } from '../admin-phase-param/admin-phase-param.component';
import { CrossJobParameters } from '../admin-jobs/admin-jobs.component';

export interface ProductSave {
    mode: 'add' | 'update';
    product: ProductView,
    phases: JobPhase[],
    params: PhaseParamSelected[]
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
    input: 2,
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
    imports: [CommonModule, AdminProductListComponent, AdminPhasesListComponent, AdminPhaseParamComponent],
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
                    (phasesSelected)="phaseSelected($event)"
                />

                <admin-phase-param
                    [phaseParams]="phaseParamsToShow()"
                    [selectedParams]="lastParamsSelected()"
                    [validationErrors]="validationErrors()"
                    (paramsSelected)="paramsSelected($event)"
                />

                <div class="actions">
                    <button (click)="cancelAdd()">Cancel</button>
                    <button [disabled]="!canAddProduct()" (click)="addProduct()">{{ buttonText() }}</button>
                </div>
            }
        </div>
    `,
    styleUrls: ['./admin-job.component.css']
})
export class AdminJobComponent {
    private configService = inject(ConfigService);

    manualSelectedProduct = signal<ProductView | null>(null);
    phaseParamsToShow = signal<PhaseParam[]>([]);
    productSave = output<ProductSave>();
    cancel = output<void>();
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

    selectedPhases = signal<JobPhase[]>([]);
    hasSelectedPhases = computed(() => this.selectedPhases().length > 0);
    crossJobParamsChanged = output<CrossJobParameters>();
    isEditing = computed(() => !!this.selectedPart());
    buttonText = computed(() => this.isEditing() ? 'Update Job Part' : 'Add Job Part');
    validationErrors = signal<PhaseParamValidationError[]>([]);
    lastParamsSelected = signal<PhaseParamSelected[] | null>(null);

    @ViewChild('productsList') productsList!: AdminProductListComponent;

    canAddProduct = computed(() => {
        if (!this.hasSelectedPhases()) return false;
        const params = this.lastParamsSelected();
        if (!params) return false;
        return this.getValidationErrors(params).length === 0;
    });

    constructor() {
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
        this.manualSelectedProduct.set(product);
        this.phaseParamsToShow.set([]);
        this.selectedPhases.set([]);
        this.lastParamsSelected.set(null);
    }

    async phaseSelected(phases: PhasesSelected) {
        this.selectedPhases.set(phases.phases);

        const cross = this.crossJobParams();
        const selected = this.selectedPart();

        const paymentParam: PhaseParam = { ...PHASE_PARAM_PAYMENT, value: cross.paymentConfirmed };
        const dateParam: PhaseParam = { ...PHASE_PARAM_DUE_DATE, value: cross.dueDate };
        const customerParam: PhaseParam = { ...PHASE_PARAM_CUSTOMER, value: cross.customer };
        const carrierParam: PhaseParam = { ...PHASE_PARAM_CARRIER, value: cross.carrier };
        const callOffParam: PhaseParam = { ...PHASE_PARAM_CALLOFF, value: cross.callOff ? 'true' : 'false' };

        const params = [
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

        this.phaseParamsToShow.set(params);

        if (selected && selected.product.id === this.effectiveSelectedProduct()?.id) {
            const crossJobParamValueMap = new Map<number, string>([
                [paymentParam.phaseParamId, paymentParam.value ?? ''],
                [dateParam.phaseParamId, dateParam.value ?? ''],
                [customerParam.phaseParamId, customerParam.value ?? ''],
                [carrierParam.phaseParamId, carrierParam.value ?? ''],
                [callOffParam.phaseParamId, callOffParam.value ?? '']
            ]);

            const selectedParams = selected.params.map(p => ({
                ...p,
                value: crossJobParamValueMap.get(p.phaseParamId) ?? p.value
            }));

            this.lastParamsSelected.set(
                await this.initializeSelectedParams(params, selectedParams)
            );
        } else {
            this.lastParamsSelected.set(
                await this.initializeSelectedParams(params, null)
            );
        }
    }

    paramsSelected(params: PhaseParamSelected[]) {
        const existing = this.lastParamsSelected() ?? [];

        const mergedMap = new Map<number, PhaseParamSelected>(
            existing.map(p => [p.phaseParamId, p])
        );

        for (const p of params) {
            const existingParam = mergedMap.get(p.phaseParamId);

            mergedMap.set(
                p.phaseParamId,
                existingParam ? { ...existingParam, ...p } : p
            );
        }

        const merged = Array.from(mergedMap.values());

        this.lastParamsSelected.set(merged);

        const errors = this.getValidationErrors(merged);
        if (errors.length > 0) {
            console.error('Invalid params detected:', errors);
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

    addProduct() {
        const product = this.effectiveSelectedProduct();
        const params = this.lastParamsSelected()?.slice() || [];

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

    cancelAdd() {
        this.cancel.emit();
        this.productsList.clearFilter();
        this.reset();
    }

    private loadJob(job: ProductSave) {
        this.selectedPhases.set([...job.phases]);
        this.lastParamsSelected.set(job.params.map(p => ({ ...p })));
    }

    private async initializeSelectedParams(
        params: PhaseParam[],
        selectedParams: PhaseParamSelected[] | null
    ): Promise<PhaseParamSelected[]> {
        const selectedMap = new Map(
            (selectedParams ?? []).map(p => [p.phaseParamId, p.value])
        );

        const result: PhaseParamSelected[] = [];

        for (const p of params) {
            let def = p.evaluation;
            if (this.isWrappedEvaluation(p)) {
                def = '';
                if (p.paramConfig) {
                    if (p.paramConfig.startsWith('CHECK(')) {
                        def = p.paramConfig.substring(6, p.paramConfig.length - 1);
                    } else {
                        try {
                            const list = await this.configService.getList(p.paramConfig);

                            if (p.input === 1 && list.value.length > 0 && !p.optional) {
                                def = list.value[0].key;
                            }
                        } catch (err) {
                            console.error(`Failed to load list for ${p.paramConfig}`, err);
                        }
                    }
                }

                if (p.input === 2 && !p.optional) {
                    def = p.evaluation ?? '(Input At Job Start)';
                }
            }

            result.push({
                phaseId: p.phaseId,
                phaseParamId: p.phaseParamId,
                phaseNumber: p.phaseNumber,
                key: p.paramName,
                value: selectedMap.get(p.phaseParamId) ?? p.value ?? def,
                input: p.input
            });
        }

        return result;
    }

    private isWrappedEvaluation(evaluation: PhaseParam): boolean {
        return !!evaluation.evaluation &&
            evaluation.evaluation.trim().startsWith('(') &&
            evaluation.evaluation.trim().endsWith(')');
    }

    private getValidationErrors(params: PhaseParamSelected[]): PhaseParamValidationError[] {
        const errors: PhaseParamValidationError[] = [];

        const quantityParam = params.find(p => p.phaseParamId === PHASE_PARAM_QUANTITY.phaseParamId);
        if (quantityParam && (!/^\d+$/.test(quantityParam.value) || Number(quantityParam.value) <= 0)) {
            errors.push({
                phaseParamId: quantityParam.phaseParamId,
                message: 'Quantity must be a whole number greater than 0.'
            });
        }

        const dueDateParam = params.find(p => p.phaseParamId === PHASE_PARAM_DUE_DATE.phaseParamId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dueDateParam) {
            const selected = new Date(dueDateParam.value);
            if (isNaN(selected.getTime())) {
                errors.push({
                    phaseParamId: dueDateParam.phaseParamId,
                    message: 'Please enter a valid due date.'
                });
            } else if (selected < today) {
                errors.push({
                    phaseParamId: dueDateParam.phaseParamId,
                    message: 'Due date cannot be in the past.'
                });
            }
        }

        const callOffParam = params.find(p => p.phaseParamId === PHASE_PARAM_CALLOFF.phaseParamId);
        const isCallOff = callOffParam?.value === 'true';

        const customerParam = params.find(p => p.phaseParamId === PHASE_PARAM_CUSTOMER.phaseParamId);
        if (customerParam) {
            const customerValue = Number(customerParam.value);
            if (isCallOff) {
                if (customerValue > 0) {
                    errors.push({
                        phaseParamId: customerParam.phaseParamId,
                        message: 'Customer must not be selected for call off jobs.'
                    });
                }
            } else {
                if (customerValue <= 0) {
                    errors.push({
                        phaseParamId: customerParam.phaseParamId,
                        message: 'Please select a customer.'
                    });
                }
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

        const carrierParam = params.find(p => p.phaseParamId === PHASE_PARAM_CARRIER.phaseParamId);
        if (carrierParam) {
            const carrierValue = Number(carrierParam.value);
            if (isCallOff) {
                if (carrierValue > 0) {
                    errors.push({
                        phaseParamId: carrierParam.phaseParamId,
                        message: 'Carrier must not be selected for call off jobs.'
                    });
                }
            } else {
                if (carrierValue <= 0) {
                    errors.push({
                        phaseParamId: carrierParam.phaseParamId,
                        message: 'Please select a carrier.'
                    });
                }
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
    }
}