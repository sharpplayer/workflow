import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductService } from '../../../core/services/product.service';

@Component({
    selector: 'admin-products-list',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="list-container">
        @if (loading()) {
        <div>Loading...</div>
        } @else {
        <div>Products here</div>
        }
        @if(!loading() && !error() && products().length > 0){
            <table>
                <thead>
                    <tr><th>Product</th><th>Name</th><th>Old Name</th><th>Enabled</th></tr>
                </thead>
                <tbody>
                    @for (product of products(); track product) {
                    <tr>
                        <td>{{ product.id }}</td>
                        <td>{{ product.name }}</td>
                        <td>{{ product.oldName }}</td>
                        <td>{{ product.enabled ? 'Yes' : 'No' }}</td>
                    </tr>
                    }
                </tbody>
            </table>
        }

        @if(error()){
            <div>{{ error() }}</div>
        }

        @if(!loading() && !error() && products().length === 0){
            <div>No products found.</div>
        }
    </div>
    `,
    styleUrls: ['./admin-products-list.component.css']
})
export class AdminProductListComponent {
    private productService = inject(ProductService);

    @Output() edit = new EventEmitter<Product>();
    @Output() create = new EventEmitter<void>();

    products = this.productService.products;
    loading = signal(true);
    error = signal('');

    constructor() {
        this.loadUsers();
    }

    async loadUsers() {
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