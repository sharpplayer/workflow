import { Component, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam, Product, ProductService } from '../../../core/services/product.service';
import { AdminProductListComponent } from '../admin-products-list/admin-products-list.component';
import { AdminPhasesListComponent, PhasesSelected } from '../admin-phases-list/admin-phases-list.component';
import { AdminPhaseParamComponent, PhaseParamSelected } from '../admin-phase-param/admin-phase-param.component';
import { CrossJobParameters } from '../admin-jobs/admin-jobs.component';

export interface ProductSave {
    mode: 'add' | 'update';
    product: Product,
    params: PhaseParamSelected[]
}
const PHASE_PARAM_QUANTITY: PhaseParam = {
    phaseParamId: -1,
    paramName: 'Quantity',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'int'
};

const PHASE_PARAM_PAYMENT: PhaseParam = {
    phaseParamId: -2,
    paramName: 'Payment Received',
    paramConfig: '',
    input: 2,
    evaluation: '(Input At Job Start)',
    type: 'boolean',
    value: 'false'
};

const PHASE_PARAM_CALLOFF: PhaseParam = {
    phaseParamId: -3,
    paramName: 'For Call Off',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean',
    value: 'false'
};

const PHASE_PARAM_FINISHED: PhaseParam = {
    phaseParamId: -4,
    paramName: 'From Call Off',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean',
    value: 'false'
};

const PHASE_PARAM_DUE_DATE: PhaseParam = {
    phaseParamId: -5,
    paramName: 'Due',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'date'
};

const PHASE_PARAM_CUSTOMER: PhaseParam = {
    phaseParamId: -6,
    paramName: 'Customer',
    paramConfig: 'customer',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'string[]'
};

const PHASE_PARAM_CARRIER: PhaseParam = {
    phaseParamId: -7,
    paramName: 'Carrier',
    paramConfig: 'carrier',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'string[]'
};


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
    manualSelectedProduct = signal<Product | null>(null);
    phaseParamsToShow = signal<PhaseParam[]>([]);
    productSave = output<ProductSave>();
    cancel = output<void>();
    hasResults = true;

    crossJobParams = input<CrossJobParameters>({
        paymentReceived: false,
        dueDate: '',
        customer: '',
        carrier: ''
    });

    selectedPart = input<ProductSave | null>(null);

    effectiveSelectedProduct = computed(() => {
        const part = this.selectedPart();
        return part ? part.product : this.manualSelectedProduct();
    });

    crossJobParamsChanged = output<CrossJobParameters>();
    isEditing = computed(() => !!this.selectedPart());
    buttonText = computed(() => this.isEditing() ? 'Update Product' : 'Add Product');

    @ViewChild('productsList') productsList!: AdminProductListComponent;

    canAddProduct = computed(() => {
        const params = this.lastParamsSelected?.();
        return !!params && this.validateParams(params);
    });

    lastParamsSelected = signal<PhaseParamSelected[] | null>(null);

    constructor() {
        effect(() => {
            const job = this.selectedPart();
            if (!job) return;
            this.loadJob(job);
        });
    }

    async onProductSelected(product: Product): Promise<void> {
        console.log("PROD SELECTED")
        this.manualSelectedProduct.set(product);
        this.phaseParamsToShow.set([]);
        this.lastParamsSelected.set(null);
    }

    phaseSelected(phases: PhasesSelected) {
        console.log("PHASE SELECTED:" + this.crossJobParams().dueDate)
        const paymentParam: PhaseParam = { ...PHASE_PARAM_PAYMENT, value: this.crossJobParams().paymentReceived ? "true" : "false" };
        const dateParam: PhaseParam = { ...PHASE_PARAM_DUE_DATE, value: this.crossJobParams().dueDate };
        const customerParam: PhaseParam = { ...PHASE_PARAM_CUSTOMER, value: this.crossJobParams().customer };
        const carrierParam: PhaseParam = { ...PHASE_PARAM_CARRIER, value: this.crossJobParams().carrier };

        const params = [
            dateParam,
            paymentParam,
            customerParam,
            carrierParam,
            PHASE_PARAM_QUANTITY,
            ...phases.params,
            PHASE_PARAM_FINISHED,
            PHASE_PARAM_CALLOFF
        ];

        this.phaseParamsToShow.set(params);

        // If we are loading an existing job, prefill selected values
        const selected = this.selectedPart();
        if (selected && selected.product.id === this.effectiveSelectedProduct()?.id) {
            const crossJobParamValueMap = new Map<number, string>([
                [paymentParam.phaseParamId, paymentParam.value ?? ""],
                [dateParam.phaseParamId, dateParam.value ?? ""],
                [customerParam.phaseParamId, customerParam.value ?? ""],
                [carrierParam.phaseParamId, carrierParam.value ?? ""]
            ]);

            console.log("DATE:" + dateParam.value);

            this.lastParamsSelected.set(
                selected.params.map(p => ({
                    ...p,
                    value: crossJobParamValueMap.get(p.phaseParamId) ?? p.value
                }))
            );
        }
    }

    paramsSelected(params: PhaseParamSelected[]) {
        this.lastParamsSelected.set(params);

        if (!this.validateParams(params)) {
            console.error('Invalid params detected:', params);
            return;
        }

        const current = this.crossJobParams();

        const paymentParam = params.find(p => p.phaseParamId === -2)?.value === 'true';
        const dueDateParam = params.find(p => p.phaseParamId === -5)?.value || '';
        const customerParam = params.find(p => p.phaseParamId === -6)?.value || '';
        const carrierParam = params.find(p => p.phaseParamId === -7)?.value || '';

        const newValue = {
            paymentReceived: paymentParam,
            dueDate: dueDateParam,
            customer: customerParam,
            carrier: carrierParam
        };

        const hasChanged =
            (newValue.paymentReceived !== current.paymentReceived) ||
            (newValue.dueDate !== current.dueDate) ||
            (newValue.customer !== current.customer) ||
            (newValue.carrier !== current.carrier);

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

        if (!this.validateParams(params)) {
            console.error('Invalid params detected:', params);
            return;
        }

        this.productSave.emit({
            mode: this.isEditing() ? 'update' : 'add',
            product: product,
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
        console.log("LOADING JOB");
        this.lastParamsSelected.set(job.params.map(p => ({ ...p })));
    }

    private validateParams(params: PhaseParamSelected[]): boolean {
        return !params.some(p =>
            this.invalidQuantity(p) || this.invalidDate(p) || this.invalidCustomer(p) || this.invalidCarrier(p)
        );
    }

    private invalidQuantity(p: PhaseParamSelected): unknown {
        return p.phaseParamId === -1 && (!/^\d+$/.test(p.value) || Number(p.value) <= 0);
    }

    private invalidCustomer(p: PhaseParamSelected): unknown {
        return p.phaseParamId === -6 && Number(p.value) <= 0;
    }

    private invalidCarrier(p: PhaseParamSelected): unknown {
        return p.phaseParamId === -7 && Number(p.value) <= 0;
    }

    private invalidDate(p: PhaseParamSelected): boolean {
        if (p.phaseParamId !== -5) return false;

        const selected = new Date(p.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return isNaN(selected.getTime()) || selected < today;
    }

    reset(): void {
        this.manualSelectedProduct.set(null);
        this.phaseParamsToShow.set([]);
        this.lastParamsSelected.set(null);
        this.hasResults = true;
    }
}