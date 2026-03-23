import { Component, inject, signal, computed, Input, Output, EventEmitter, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../core/services/user.service';

export interface UserForm {
    username: string;
    password: string;
    roles: string[];
    resetPin: boolean;
    enabled: boolean;
}

@Component({
    selector: 'admin-user',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="modal-card">
        <h2>{{ isEdit ? 'Edit User' : 'Create User' }}</h2>

        <form (ngSubmit)="save()">

            <div class="field">
            <label>Username</label>
            <input type="text"
                    [ngModel]="form().username"
                    [disabled]="isEdit"
                    name="username"
                    (ngModelChange)="update('username', $event)"
                    placeholder="Enter username" />
            </div>

            <div class="field">
            <label>Password</label>
            <input type="password"
                    [ngModel]="form().password"
                    name="password"
                    (ngModelChange)="update('password', $event)"
                    placeholder="Enter password" />
            </div>

            <div class="field checkbox-field" *ngIf="isEdit">
            <label>
                <input type="checkbox"
                    [ngModel]="form().resetPin"
                    name="resetPin"
                    (ngModelChange)="update('resetPin', $event)" />
                Reset PIN
            </label>
            </div>

            <div class="field">
                <label>Roles</label>
                <div class="roles-container">
                    @for (role of roles(); track role) {
                        <div class="role-item">
                        <label>
                            <input type="checkbox"
                                [ngModel]="form().roles.includes(role)"
                                [name]="'role-' + role"
                                (ngModelChange)="toggleRole(role)" />
                                {{ role }}
                            </label>
                        </div>
                    }
                </div>
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
    styleUrl: './admin-user.component.css'
})
export class AdminUserComponent {
    private userService = inject(UserService);

    roles = input<string[]>();
    @Input() set initialData(data: UserForm | null) {
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
    @Output() saved = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    form = signal<UserForm>(this.emptyForm());
    isEdit = false;
    private initialForm = signal<UserForm>(this.emptyForm());

    private emptyForm(): UserForm {
        return { username: '', password: '', roles: [], resetPin: false, enabled: true };
    }

    canSubmit = computed(() => {
        const f = this.form();
        const dirty = this.isDirty();
        return f.username.trim() !== ''
            && (this.isEdit || f.password.trim() !== '')
            && f.roles.length > 0
            && dirty;
    });

    isDirty = computed(() => {
        const current = this.form();
        const initial = this.initialForm();
        return (
            current.username !== initial.username ||
            current.password !== initial.password ||
            current.resetPin !== initial.resetPin ||
            current.enabled !== initial.enabled ||
            current.roles.length !== initial.roles.length ||
            current.roles.some(r => !initial.roles.includes(r))
        );
    });

    update(field: keyof UserForm, value: string | boolean) {
        this.form.update(f => ({ ...f, [field]: value }));
    }

    toggleRole(role: string) {
        this.form.update(f => {
            const roles = f.roles.includes(role)
                ? f.roles.filter(r => r !== role)
                : [...f.roles, role];
            return { ...f, roles };
        });
    }

    async save() {
        if (this.isEdit) {
            await this.userService.updateUser(this.form());
        } else {
            await this.userService.createUser(this.form());
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