import { Component, inject, signal, computed, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../core/services/product.service';

export interface ProductForm {
    id: number;
    name: string;
    oldName: string;
    rackType: string;
    finish: string;
    enabled: boolean;
}

@Component({
    selector: 'admin-product',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-card">
        <h2>{{ isEdit ? 'Edit Product' : 'Create Product' }}</h2>

        <form (ngSubmit)="save()">

            <div class="field">
            <label>Name</label>
            <input type="text"
                    [ngModel]="form().name"
                    [disabled]="isEdit"
                    name="name"
                    (ngModelChange)="update('name', $event)"
                    placeholder="Enter product name" />
            </div>
            <div class="field">
            <label>Sage Name</label>
            <input type="text"
                    [ngModel]="form().oldName"
                    name="oldName"
                    (ngModelChange)="update('oldName', $event)"
                    placeholder="Enter old product name" />
            </div>

            <div class="field">
            <label>Rack Type</label>
            <select
                [ngModel]="form().rackType || rackTypes[0]"
                name="rackType"
                (ngModelChange)="update('rackType', $event)"
            >
                <option *ngFor="let o of rackTypes" [value]="o">
                {{ o }}
                </option>
            </select>
            </div>

            <div class="field">
            <label>Finish</label>
            <input
                type="text"
                [ngModel]="form().finish"
                name="width"
                (ngModelChange)="update('width', $event)"
            />
            </div>

            <div class="field checkbox-field" *ngIf="isEdit">
            <label>
                <input type="checkbox"
                    [ngModel]="form().enabled"
                    name="enabled"
                    (ngModelChange)="update('enabled', $event)" />
                Enabled
            </label>
            </div>

            <div class="button-group">
            <button type="button" (click)="cancel()">Cancel</button>
            <button type="submit" [disabled]="!canSubmit()">
                {{ isEdit ? 'Update' : 'Create' }}
            </button>
            </div>

        </form>
    </div>
  `,
    styleUrl: './admin-product.component.css'
})
export class AdminProductComponent {
    private productService = inject(ProductService);

    @Input() set initialData(data: ProductForm | null) {
        if (data) {
            this.form.set({ ...data });
            this.initialForm.set({ ...data });
            this.isEdit = true;
        } else {
            this.form.set(this.emptyForm());
            this.initialForm.set(this.emptyForm());
            this.isEdit = false;
        }
    }
    @Input() rackTypes: string[] = [];
    @Output() saved = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    form = signal<ProductForm>(this.emptyForm());
    isEdit = false;
    private initialForm = signal<ProductForm>(this.emptyForm());

    private emptyForm(): ProductForm {
        return {
            id: 0,
            name: '',
            oldName: '',
            rackType: '',
            finish: '',
            enabled: true
        };
    }

    canSubmit = computed(() => {
        const f = this.form();
        const dirty = this.isDirty();
        return f.name.trim() !== ''
            && dirty;
    });

    isDirty = computed(() => {
        const current = this.form();
        const initial = this.initialForm();
        return (
            current.name !== initial.name
        );
    });

    update(field: keyof ProductForm, value: string | boolean) {
        this.form.update(f => ({ ...f, [field]: value }));
    }


    async save() {
        if (this.isEdit) {
            await this.productService.updateProduct(this.form());
        } else {
            await this.productService.createProduct(this.form());
        }
        this.form.set(this.emptyForm());
        this.initialForm.set(this.emptyForm());
        this.isEdit = false;
        this.saved.emit();
    }

    cancel() {
        this.form.set(this.emptyForm());
        this.initialForm.set(this.emptyForm());
        this.isEdit = false;
        this.cancelled.emit();
    }
}