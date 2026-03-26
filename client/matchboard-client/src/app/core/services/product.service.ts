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
  input: number,
  evaluation: string
}

export interface Phase {
  id: number,
  description: string,
  params: PhaseParam[],
  order: number
}

export interface ProductsResponse {
  products: Product[];
  validationErrors: string;
}

interface PhasesResponse {
  phases: Phase[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);

  async loadProducts(): Promise<ProductsResponse> {
    const res = await firstValueFrom(
      this.http.get<ProductsResponse>(`${API_BASE_URL}/api/products`, { withCredentials: true })
    );
    return res;
  }

  async loadProductPhases(productId: number): Promise<Phase[]> {
    const res = await firstValueFrom(
      this.http.get<PhasesResponse>(`${API_BASE_URL}/api/products/${productId}/phases`, { withCredentials: true })
    );
    return res.phases;
  }

  async loadAllPhases(): Promise<Phase[]> {
    const res = await firstValueFrom(
      this.http.get<PhasesResponse>(`${API_BASE_URL}/api/phases`, { withCredentials: true })
    );
    return  res.phases;
  }

  async savePhases(productId: number, phases: Phase[]): Promise<void> {
    await firstValueFrom(
      this.http.put(`${API_BASE_URL}/api/products/${productId}/phases`, { phases }, { withCredentials: true })
    );
  }

  async createPhase(phase: Phase): Promise<Phase> {
    return await firstValueFrom(
      this.http.post<Phase>(`${API_BASE_URL}/api/phases`, { description: phase.description, params: phase.params }, { withCredentials: true })
    );
  }

  async resolvePhase(productId: number, phase: number): Promise<Phase> {
    return await firstValueFrom(
      this.http.get<Phase>(`${API_BASE_URL}/api/products/${productId}/phases/${phase}`, { withCredentials: true })
    );
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