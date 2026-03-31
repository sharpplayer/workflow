import { Component, computed, inject, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam, Product, ProductService } from '../../../core/services/product.service';
import { AdminProductListComponent } from '../admin-products-list/admin-products-list.component';
import { AdminPhasesListComponent, PhasesSelected } from '../admin-phases-list/admin-phases-list.component';
import { AdminPhaseParamComponent, PhaseParamSelected } from '../admin-phase-param/admin-phase-param.component';
import { CrossJobParameters } from '../admin-jobs/admin-jobs.component';

export interface ProductSelected {
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
    type: 'boolean'
};

const PHASE_PARAM_CALLOFF: PhaseParam = {
    phaseParamId: -3,
    paramName: 'Call Off',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean'
};

const PHASE_PARAM_FINISHED: PhaseParam = {
    phaseParamId: -4,
    paramName: 'From Finished',
    paramConfig: '',
    input: 1,
    evaluation: '(Input At Job Create)',
    type: 'boolean'
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


@Component({
    selector: 'admin-job-page',
    standalone: true,
    imports: [CommonModule, AdminProductListComponent, AdminPhasesListComponent, AdminPhaseParamComponent],
    template: `
        <div class="jobs-container">
            <admin-products-list
              #productsList
              (productSelected)="onProductSelected($event)"
              (hasResults)="hasResults = $event"
              (selectionCleared)="selectedProduct.set(null)"
            />
            @if (selectedProduct() && hasResults) {
              <admin-phases-list [productId]="selectedProduct()!.id" (phasesSelected)="phaseSelected($event)"/>
              <admin-phase-param [phaseParams]="phaseParamsToShow()" (paramsSelected)="paramsSelected($event)" />
              <button [disabled]="!canAddProduct()" (click)="addProduct()">Add Product</button>
            }
        </div>
    `,
    styleUrls: ['./admin-job.component.css']
})
export class AdminJobComponent {
    protected productService = inject(ProductService);
    selectedProduct = signal<Product | null>(null);
    phaseParamsToShow = signal<PhaseParam[]>([]);
    productSelected = output<ProductSelected>();
    hasResults = true;
    crossJobParams = input<CrossJobParameters>({
        paymentReceived: false,
        dueDate: '',
        customer: ''
    });
    crossJobParamsChanged = output<CrossJobParameters>();

    @ViewChild('productsList') productsList!: AdminProductListComponent;

    // reactive signal to track if "Add Product" can be clicked
    canAddProduct = computed(() => {
        const params = this.lastParamsSelected?.();
        return !!params && this.validateParams(params);
    });

    // store last selected params as a signal
    lastParamsSelected = signal<PhaseParamSelected[] | null>(null);

    async onProductSelected(product: Product): Promise<void> {
        this.selectedProduct.set(product);
        this.productService.loadProductPhases(product.id);
    }

    phaseSelected(phases: PhasesSelected) {
        const paymentParam: PhaseParam = { ...PHASE_PARAM_PAYMENT, value: this.crossJobParams().paymentReceived ? "true" : "false" };
        const dateParam: PhaseParam = { ...PHASE_PARAM_DUE_DATE, value: this.crossJobParams().dueDate };
        const customerParam: PhaseParam = { ...PHASE_PARAM_CUSTOMER, value: this.crossJobParams().customer };
        let params = [dateParam, paymentParam, customerParam, PHASE_PARAM_QUANTITY, ...phases.params, PHASE_PARAM_FINISHED, PHASE_PARAM_CALLOFF]
        this.phaseParamsToShow.set(params);
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
        const newValue = {
            paymentReceived: paymentParam,
            dueDate: dueDateParam,
            customer: customerParam
        }

        const hasChanged = (newValue.paymentReceived !== current.paymentReceived) ||
            (newValue.dueDate !== current.dueDate);

        if (hasChanged) {
            this.crossJobParamsChanged.emit(newValue);
        }

    }

    addProduct() {
        const product = this.selectedProduct();
        const params = this.lastParamsSelected()?.slice() || [];

        if (!product) {
            console.error('No product selected!');
            return;
        }

        if (!this.validateParams(params)) {
            console.error('Invalid params detected:', params);
            return;
        }

        this.productSelected.emit({
            product: product,
            params: params
        });

        this.productsList.clearFilter();
        this.reset();
    }

    private validateParams(params: PhaseParamSelected[]): boolean {
        return !params.some(p =>
            this.invalidQuantity(p) || this.invalidDate(p) || this.invalidCustomer(p)
        );
    }

    private invalidQuantity(p: PhaseParamSelected): unknown {
        return p.phaseParamId === -1 && (!/^\d+$/.test(p.value) || Number(p.value) <= 0);
    }

    private invalidCustomer(p: PhaseParamSelected): unknown {
        return p.phaseParamId === -6 && Number(p.value) <= 0;
    }

    private invalidDate(p: PhaseParamSelected): boolean {
        if (p.phaseParamId !== -5) return false;

        const selected = new Date(p.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return isNaN(selected.getTime()) || selected < today;
    }

    reset(): void {
        this.selectedProduct.set(null);
        this.phaseParamsToShow.set([]);
        this.lastParamsSelected.set(null);
        this.hasResults = true;
    }
}