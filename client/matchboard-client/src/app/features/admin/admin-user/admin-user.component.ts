import { Component, inject, signal, computed, Input } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { CommonModule } from '@angular/common';

export interface UserForm {
    username: string;
    password: string;
    roles: string[];
}

@Component({
    selector: 'admin-user',
    standalone: true,
    imports: [CommonModule],
    template: `
    <h2>{{ isEdit ? 'Edit User' : 'Create User' }}</h2>

    <form (submit)="save($event)">
        <label>Username
            <input [value]="form().username" (input)="update('username', $any($event.target).value)">
        </label>

        <label>Password
            <input type="password" [value]="form().password" (input)="update('password', $any($event.target).value)">
        </label>

        <label>Roles</label>
        <div class="roles-container">
            <div *ngFor="let role of roles()" class="role-item">
            <input type="checkbox"
                    [checked]="form().roles.includes(role)"
                    (change)="toggleRole(role)">
            {{ role }}
            </div>
        </div>

        <button type="submit" [disabled]="!canSubmit()"> {{ isEdit ? 'Update' : 'Create' }} </button>
        <button type="button" (click)="cancel()">Cancel</button>
      </form>
  `,
    styleUrl: './admin-user.component.css'
})
export class AdminUserComponent {
    private userService = inject(UserService);

    @Input() roles = signal<string[]>([]);
    @Input() set initialData(data: UserForm | null) {
        if (data) {
            this.form.set({ ...data });
            this.isEdit = true;
        } else {
            this.form.set({ username: '', password: '', roles: [] });
            this.isEdit = false;
        }
    }

    form = signal<UserForm>({ username: '', password: '', roles: [] });
    isEdit = false;
    private initialForm = signal<UserForm>({
        username: '',
        password: '',
        roles: []
    });

    canSubmit = computed(() => {
        const f = this.form();
        return f.username.trim() !== ''
            && f.password.trim() !== ''
            && f.roles.length > 0;
    });

    isDirty = computed(() => {
        const current = this.form();
        const initial = this.initialForm();

        return (
            current.username !== initial.username ||
            current.password !== initial.password ||
            current.roles.length !== initial.roles.length ||
            current.roles.some(r => !initial.roles.includes(r))
        );
    });

    update(field: keyof UserForm, value: string) {
        this.form.update(f => ({ ...f, [field]: value }));
    }

    toggleRole(roleId: string) {
        this.form.update(f => {
            const roles = f.roles.includes(roleId)
                ? f.roles.filter(r => r !== roleId)
                : [...f.roles, roleId];
            return { ...f, roles };
        });
    }

    async save(event: Event) {
        event.preventDefault();
        if (this.isEdit) {
            // TODO: implement update logic
        } else {
            await this.userService.createUser(this.form());
            this.form.set({ username: '', password: '', roles: [] });
        }
        const current = this.form();
        this.initialForm.set({ ...current });
    }
    cancel() {
        const empty = { username: '', password: '', roles: [] };
        this.form.set(empty);
        this.initialForm.set(empty);
        this.isEdit = false;
    }
}