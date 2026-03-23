import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { Product } from "../../../core/services/product.service";
import { AdminProductListComponent } from "../admin-products-list/admin-products-list.component";
import { AdminProductComponent, ProductForm } from "../admin-product/admin-product.component";
import { ConfigService } from "../../../core/services/config.service";

@Component({
    selector: 'admin-products-page',
    standalone: true,
    imports: [CommonModule, AdminProductListComponent, AdminProductComponent],
    template: `
     <div class="user-container">

        <admin-products-list>
        </admin-products-list>

        @if(showModal())
        {
            <div class="backdrop"  (click)="closeModal()"></div>
            <admin-product
                [initialData]="selectedProduct()"
                [rackTypes]="rackTypes()"
                (saved)="closeModal()"
                (cancelled)="closeModal()">
            </admin-product>
        }
    </div>
  `
})
export class AdminProductsComponent {
    private configService = inject(ConfigService);
    rackTypes = this.configService.rackTypes;
    selectedProduct = signal<ProductForm | null>(null);
    showModal = signal(false);

    constructor() {
        this.configService.loadRackTypes()
    }

    closeModal() {
        this.showModal.set(false);
        this.selectedProduct.set(null);
    }
}