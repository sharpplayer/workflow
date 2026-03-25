import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductService } from '../../../core/services/product.service';
import { AdminProductListComponent } from '../admin-products-list/admin-products-list.component';
import { AdminPhasesComponent } from '../admin-phases-list/admin-phases-list.component';

@Component({
    selector: 'admin-jobs-page',
    standalone: true,
    imports: [CommonModule, AdminProductListComponent, AdminPhasesComponent],
    template: `
        <div class="jobs-container">
            <admin-products-list
              (productSelected)="onProductSelected($event)"
              (hasResults)="hasResults = $event"
              (selectionCleared)="selectedProduct.set(null)"
            />
            @if (selectedProduct() && hasResults) {
              <admin-phases-list [productId]="selectedProduct()!.id"/>
            }
        </div>
    `,
    styleUrls: ['./admin-jobs.component.css']
})
export class AdminJobsComponent {
    protected productService = inject(ProductService);
    selectedProduct = signal<Product | null>(null);
    hasResults = true;

    async onProductSelected(product: Product): Promise<void> {
        this.selectedProduct.set(product);
        this.productService.loadProductPhases(product.id);
    }
}