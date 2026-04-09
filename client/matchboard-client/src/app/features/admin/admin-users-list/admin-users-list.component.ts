import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, UserService } from '../../../core/services/user.service';

@Component({
  selector: 'admin-users-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="list-container">
      <div class="list-header">
        <button type="button" (click)="create.emit()">Create User</button>
      </div>

      @if (loading()) {
        <div>Loading users...</div>
      } @else if (error()) {
        <div>{{ error() }}</div>
      } @else if (users().length > 0) {
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Roles</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.username) {
              <tr>
                <td>{{ user.username }}</td>
                <td>{{ user.roles.join(', ') }}</td>
                <td>{{ user.enabled ? 'Yes' : 'No' }}</td>
                <td>
                  <button type="button" (click)="edit.emit(user)">Edit</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div>No users found.</div>
      }
    </div>
  `,
  styleUrl: './admin-users-list.component.css'
})
export class AdminUsersListComponent {
  private readonly userService = inject(UserService);

  readonly edit = output<User>();
  readonly create = output<void>();

  readonly users = this.userService.users;
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    void this.loadUsers();
  }

  async loadUsers(): Promise<void> {
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