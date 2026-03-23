import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';

export interface Product {
  id: number,
  name: string,
  oldName: string,
  enabled: boolean
}

interface ProductsResponse {
  products: Product[];
  validationErrors: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  products = signal<Product[]>([]);

  async loadProducts(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<ProductsResponse>(`${API_BASE_URL}/api/products`, { withCredentials: true })
    );
    this.products.set(res.products);
  }

  async createProduct(product: Partial<Product>): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/api/products`, product, { withCredentials: true })
    );
    await this.loadProducts();
  }

  async updateProduct(product: Partial<Product>): Promise<void> {
    await firstValueFrom(
      this.http.patch(`${API_BASE_URL}/api/products`, product, { withCredentials: true })
    );
    await this.loadProducts();
  }
}