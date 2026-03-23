import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserService } from '../../../core/services/user.service';

@Component({
    selector: 'admin-users-list',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="list-container">

      <div class="list-header">
        <button (click)="create.emit()">Create User</button>
      </div>

      <div *ngIf="loading()">Loading users...</div>
      <div *ngIf="error()">{{ error() }}</div>

      <table *ngIf="!loading() && !error() && users().length > 0">
          <thead>
              <tr><th>Username</th><th>Roles</th><th>Enabled</th></tr>
          </thead>
          <tbody>
              <tr *ngFor="let user of users()">
                  <td>{{ user.username }}</td>
                  <td>{{ user.roles.join(', ') }}</td>
                  <td>{{ user.enabled ? 'Yes' : 'No' }}</td>
                  <td>
                      <button (click)="edit.emit(user)">Edit</button>
                  </td>
              </tr>
          </tbody>
      </table>

      <div *ngIf="!loading() && !error() && users().length === 0">No users found.</div>

    </div>
  `,
    styleUrls: ['./admin-users-list.component.css']
})
export class AdminUserListComponent {
    private userService = inject(UserService);

    @Output() edit = new EventEmitter<User>();
    @Output() create = new EventEmitter<void>();

    users = this.userService.users;
    loading = signal(true);
    error = signal('');

    constructor() {
        this.loadUsers();
    }

    async loadUsers() {
        this.loading.set(true);
        this.error.set('');
        try {
            await this.userService.loadUsers();
        } catch (err) {
            console.error(err);
            this.error.set('Failed to load users');
        } finally {
            this.loading.set(false);
        }
    }
}