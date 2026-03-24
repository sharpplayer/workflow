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

export interface PhaseParam {
  phaseParamId: number,
  paramName: string,
  paramConfig: string,
  input: boolean
}

export interface Phase {
  id: number,
  description: string,
  params: PhaseParam[],
  order: number
}

interface ProductsResponse {
  products: Product[];
  validationErrors: string;
}

interface PhasesResponse {
  phases: Phase[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  products = signal<ProductsResponse>({
    products: [],
    validationErrors: ''
  });
  phases = signal<Phase[]>([]);

  async loadProducts(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<ProductsResponse>(`${API_BASE_URL}/api/products`, { withCredentials: true })
    );
    this.products.set(res);
  }

  async loadPhases(productId: number): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<PhasesResponse>(`${API_BASE_URL}/api/phases/${productId}`, { withCredentials: true })
    );
    console.log(res.phases);
    this.phases.set(res.phases);
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