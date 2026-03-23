import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { AdminProductListComponent } from "../admin-products-list/admin-products-list.component";

@Component({
    selector: 'admin-products-page',
    standalone: true,
    imports: [CommonModule, AdminProductListComponent],
    template: `
     <div class="user-container">
        <admin-products-list>
        </admin-products-list>
    </div>
  `
})
export class AdminProductsComponent {
}