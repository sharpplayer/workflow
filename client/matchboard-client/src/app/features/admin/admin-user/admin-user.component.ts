import { Component, inject, signal, computed, Input } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { CommonModule } from '@angular/common';

interface UserForm {
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
    </form>
  `,
  styleUrl: './admin-user.component.css'
})
export class AdminUserComponent {
  private userService = inject(UserService);

  @Input() roles = signal<string[]>([]); // pass in roles from parent
  @Input() initialData?: UserForm;       // optional, for edit

  form = signal<UserForm>({ username: '', password: '', roles: [] });
  isEdit = false;

  canSubmit = computed(() => {
    const f = this.form();
    return f.username.trim() !== ''
        && f.password.trim() !== ''
        && f.roles.length > 0;
  });

  constructor() {
    if (this.initialData) {
      this.form.set({ ...this.initialData });
      this.isEdit = true;
    }
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
    if (this.isEdit) {
      // TODO: implement update logic
    } else {
      await this.userService.createUser(this.form());
      this.form.set({ username: '', password: '', roles: [] });
    }
  }
}