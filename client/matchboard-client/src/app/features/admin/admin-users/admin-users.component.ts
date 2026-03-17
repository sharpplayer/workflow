import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../app.config';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';

interface Role { name: string; value: string[]; }
interface UserForm { username: string; password: string; roles: string[]; }

@Component({
    selector: 'admin-users',
    standalone: true,
    imports: [CommonModule],
    template: `
    <h2>Create User</h2>

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

      <button type="submit" [disabled]="!canSubmit()">Create User</button>
    </form>
  `,
    styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent {

    private http = inject(HttpClient);

    roles = signal<string[]>([]);
    form = signal<UserForm>({ username: '', password: '', roles: [] });

    // snapshot for dirty tracking
    private initial = signal<UserForm>({ username: '', password: '', roles: [] });

    // dirty signal: true if form differs from initial snapshot
    canSubmit = computed(() => {
    const f = this.form();
    return f.username.trim() !== '' 
        && f.password.trim() !== '' 
        && f.roles.length > 0;
    });

    constructor() { this.loadRoles(); }

    async loadRoles() {
        const roles = await firstValueFrom(
            this.http.get<Role>(`${API_BASE_URL}/api/config/roles`)
        );
        this.roles.set(roles.value ?? []);
    }

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

        await this.http.post(`${API_BASE_URL}/api/create-user`, this.form()).toPromise();

        // reset initial snapshot to mark form as clean
        this.initial.set({ ...this.form() });
    }
}