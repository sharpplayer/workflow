import { Component, computed, effect, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam, ProductView } from '../../../core/services/product.service';
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
export const PHASE_PARAM_ID_SCHEDULE = -9;

export const PHASE_PARAM_QUANTITY: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_QUANTITY,
    phaseNumber: 0,
    paramName: 'Quantity',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'int',
    optional : false
};

const PHASE_PARAM_PAYMENT: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_PAYMENT,
    phaseNumber: 0,
    paramName: 'Payment Confirmed',
    paramConfig: '',
    input: 2,
    evaluation: '(Input At Job Start)',
    type: 'boolean',
    value: 'false',
    optional : false
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
    optional : false
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
    optional : false
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
    optional : false
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
    editable: true,
    optional : true
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
    editable: true,
    optional : true
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
    optional : false
};

export const PHASE_PARAM_SCHEDULE: PhaseParam = {
    phaseId: 0,
    phaseParamId: PHASE_PARAM_ID_SCHEDULE,
    phaseNumber: 0,
    paramName: 'Run Job Part On',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Start)',
    type: 'date',
    optional : true
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
    [PHASE_PARAM_ID_SCHEDULE, PHASE_PARAM_SCHEDULE],
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
                    [selectedParams]="lastParamsSelected() ?? selectedPart()?.params ?? []"
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
        scheduledOn: '',
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

    phaseSelected(phases: PhasesSelected) {
        this.selectedPhases.set(phases.phases);

        const cross = this.crossJobParams();
        const selected = this.selectedPart();

        const paymentParam: PhaseParam = { ...PHASE_PARAM_PAYMENT, value: cross.paymentConfirmed ? 'true' : 'false' };
        const dateParam: PhaseParam = { ...PHASE_PARAM_DUE_DATE, value: cross.dueDate };
        const customerParam: PhaseParam = { ...PHASE_PARAM_CUSTOMER, value: cross.customer };
        const carrierParam: PhaseParam = { ...PHASE_PARAM_CARRIER, value: cross.carrier };
        const callOffParam: PhaseParam = { ...PHASE_PARAM_CALLOFF, value: cross.callOff ? 'true' : 'false' };

        const existingSelectedSchedule =
            selected?.params.find(p => p.phaseParamId === PHASE_PARAM_SCHEDULE.phaseParamId)?.value;

        const scheduledParam: PhaseParam = {
            ...PHASE_PARAM_SCHEDULE,
            value: existingSelectedSchedule ?? cross.scheduledOn
        };

        const params = [
            dateParam,
            paymentParam,
            callOffParam,
            customerParam,
            carrierParam,
            PHASE_PARAM_QUANTITY,
            scheduledParam,
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

            this.lastParamsSelected.set(
                selected.params.map(p => ({
                    ...p,
                    value: crossJobParamValueMap.get(p.phaseParamId) ?? p.value
                }))
            );
        } else {
            this.lastParamsSelected.set(
                params.map(p => ({
                    phaseId: p.phaseId,
                    phaseParamId: p.phaseParamId,
                    phaseNumber: p.phaseNumber,
                    key: p.paramName,
                    value: p.value /*?? p.evaluation */ || '',
                    input: p.input
                }))
            );
        }
    }

    paramsSelected(params: PhaseParamSelected[]) {
        this.lastParamsSelected.set(params);

        const errors = this.getValidationErrors(params);
        if (errors.length > 0) {
            console.error('Invalid params detected:', errors);
            return;
        }

        const current = this.crossJobParams();

        const paymentParam = params.find(p => p.phaseParamId === PHASE_PARAM_PAYMENT.phaseParamId)?.value ?? '';
        const dueDateParam = params.find(p => p.phaseParamId === PHASE_PARAM_DUE_DATE.phaseParamId)?.value ?? '';
        const customerParam = params.find(p => p.phaseParamId === PHASE_PARAM_CUSTOMER.phaseParamId)?.value ?? '';
        const carrierParam = params.find(p => p.phaseParamId === PHASE_PARAM_CARRIER.phaseParamId)?.value ?? '';
        const callOffParam = params.find(p => p.phaseParamId === PHASE_PARAM_CALLOFF.phaseParamId)?.value === 'true';
        const scheduledParam = params.find(p => p.phaseParamId === PHASE_PARAM_SCHEDULE.phaseParamId)?.value ?? '';

        // Keep schedule in shared state as the default for the next new part,
        // but parent will not push it back into existing parts.
        const newValue: CrossJobParameters = {
            jobId: current.jobId,
            jobNumber: current.jobNumber,
            paymentConfirmed: paymentParam,
            dueDate: dueDateParam,
            customer: customerParam,
            carrier: carrierParam,
            callOff: callOffParam,
            scheduledOn: scheduledParam,
            status: current.status
        };

        const hasChanged =
            (newValue.paymentConfirmed !== current.paymentConfirmed) ||
            (newValue.dueDate !== current.dueDate) ||
            (newValue.customer !== current.customer) ||
            (newValue.carrier !== current.carrier) ||
            (newValue.callOff !== current.callOff) ||
            (newValue.scheduledOn !== current.scheduledOn);

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
            product: product,
            phases: this.selectedPhases(),
            params: params
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

        const scheduleParam = params.find(p => p.phaseParamId === PHASE_PARAM_SCHEDULE.phaseParamId);
        if (scheduleParam && scheduleParam.value) {
            const selected = new Date(scheduleParam.value);

            if (!isNaN(selected.getTime()) && selected < today) {
                errors.push({
                    phaseParamId: scheduleParam.phaseParamId,
                    message: 'Run date cannot be in the past.'
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

        const paidParam = params.find(p => p.phaseParamId === PHASE_PARAM_PAYMENT.phaseParamId);
        const isPaid = paidParam?.value === 'true';
        if (isCallOff && isPaid) {
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

        return errors;
    }

    private invalidDate(p: PhaseParamSelected): boolean {
        if (p.phaseParamId !== PHASE_PARAM_DUE_DATE.phaseParamId) return false;

        const selected = new Date(p.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return isNaN(selected.getTime()) || selected < today;
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