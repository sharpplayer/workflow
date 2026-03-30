import { Component, computed, inject, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam, Product, ProductService } from '../../../core/services/product.service';
import { AdminProductListComponent } from '../admin-products-list/admin-products-list.component';
import { AdminPhasesListComponent, PhasesSelected } from '../admin-phases-list/admin-phases-list.component';
import { AdminPhaseParamComponent, PhaseParamSelected } from '../admin-phase-param/admin-phase-param.component';

export interface ProductSelected {
    product: Product,
    params: PhaseParamSelected[]
}
const PHASE_PARAM_QUANTITY: PhaseParam = {
    phaseParamId: -1,
    paramName: 'Quantity',
    paramConfig: '',
    input: 1,
    evaluation: '()',
    type: 'int'
};

const PHASE_PARAM_PAYMENT: PhaseParam = {
    phaseParamId: -2,
    paramName: 'Payment Received',
    paramConfig: '',
    input: 1,
    evaluation: '()',
    type: 'boolean'
};

const PHASE_PARAM_CALLOFF: PhaseParam = {
    phaseParamId: -3,
    paramName: 'Call Off',
    paramConfig: '',
    input: 1,
    evaluation: '()',
    type: 'boolean'
};

const PHASE_PARAM_FINISHED: PhaseParam = {
    phaseParamId: -4,
    paramName: 'From Finished',
    paramConfig: '',
    input: 1,
    evaluation: '()',
    type: 'boolean'
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
    paymentReceived = input<boolean>(false);
    @ViewChild('productsList') productsList!: AdminProductListComponent;

    // reactive signal to track if "Add Product" can be clicked
    canAddProduct = computed(() => {
        const params = this.lastParamsSelected?.();
        return !!params && this.validateParams(params);
    });

    // store last selected params as a signal
    lastParamsSelected = signal<PhaseParamSelected[] | null>(null);

    async onProductSelected(product: Product): Promise<void> {
        console.log("XXX:" + this.paymentReceived());
        this.selectedProduct.set(product);
        this.productService.loadProductPhases(product.id);
    }

    phaseSelected(phases: PhasesSelected) {
        const paymentParam: PhaseParam = { ...PHASE_PARAM_PAYMENT, value: this.paymentReceived() ? "true" : "false" };
        console.log("PPP:" + paymentParam.value);
        let params = [PHASE_PARAM_QUANTITY, paymentParam, ...phases.params, PHASE_PARAM_FINISHED, PHASE_PARAM_CALLOFF]
        this.phaseParamsToShow.set(params);
    }

    paramsSelected(params: PhaseParamSelected[]) {
        this.lastParamsSelected.set(params);
        if (!this.validateParams(params)) {
            console.error('Invalid params detected:', params);
            return;
        }

        const paymentParam = params.find(p => p.phaseParamId === -2);
        if (paymentParam) {
            const newValue = !!Number(paymentParam.value);
            if (newValue !== this.paymentReceived()) {
                //this.paymentReceived.set(newValue);
            }
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
            p.phaseParamId === -1 && (!/^\d+$/.test(p.value) || Number(p.value) <= 0)
        );
    }

    reset(): void {
        this.selectedProduct.set(null);
        this.phaseParamsToShow.set([]);
        this.lastParamsSelected.set(null);
        this.hasResults = true;
    }
}