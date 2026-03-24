import { Component, EventEmitter, inject, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, ProductService } from '../../../core/services/product.service';

@Component({
    selector: 'admin-products-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="list-container">
        <div class="filter-bar">
            <input
                type="text"
                placeholder="Filter by name..."
                [ngModel]="filterText()"
                (ngModelChange)="filterText.set($event)"
            />
        </div>

        @if (loading()) {
            <div>Loading...</div>
        } @else {
            @if (!error()) {
                @if (filteredProducts().length > 0) {
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Sage Name</th>
                                <th>Enabled</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (product of filteredProducts(); track product.name) {
                                <tr
                                    [class.selectable]="hasSelectionListener"
                                    [class.selected]="selectedProduct() === product"
                                    (click)="selectProduct(product)"
                                >
                                    <td>{{ product.name }}</td>
                                    <td>{{ product.oldName }}</td>
                                    <td>{{ product.enabled ? 'Yes' : 'No' }}</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                } @else {
                    @if(hasSelectionListener && filterText().length === 0)
                    {
                        <div>Select a product.</div>
                    }
                    @else
                    {
                        <div>No products match "{{ filterText() }}".</div>
                    }
                }

                @if (!hasSelectionListener && products().validationErrors) {
                    @for (err of products().validationErrors.split(';').filter(e => e.trim() !== ''); track err) {
                        <div class="validation-error">{{ err }}</div>
                    }
                }
            } @else {
                <div class="error">{{ error() }}</div>
            }
        }

        @if(!hasSelectionListener)
        {
            <button type="button" (click)="loadProducts()">Reload</button>
        }
    </div>
    `,
    styleUrls: ['./admin-products-list.component.css']
})
export class AdminProductListComponent {
    private productService = inject(ProductService);

    @Output() create = new EventEmitter<void>();
    @Output() productSelected = new EventEmitter<Product>();

    products = this.productService.products;
    loading = signal(true);
    error = signal('');
    filterText = signal('');
    selectedProduct = signal<Product | null>(null);

    filteredProducts = computed(() => {
        const term = this.filterText().toLowerCase().trim();
        const all = this.products().products ?? [];
        return term
            ? all.filter(p => p.name?.toLowerCase().includes(term))
            : (this.hasSelectionListener ? [] : all);
    });

    get hasSelectionListener(): boolean {
        return this.productSelected.observed;
    }

    constructor() {
        this.loadProducts();
    }

    selectProduct(product: Product): void {
        if (!this.productSelected.observed) return;
        this.selectedProduct.set(product);
        this.productSelected.emit(product);
    }

    async loadProducts() {
        this.loading.set(true);
        this.error.set('');
        try {
            await this.productService.loadProducts();
        } catch (err) {
            console.error(err);
            this.error.set('Failed to load products');
        } finally {
            this.loading.set(false);
        }
    }
}