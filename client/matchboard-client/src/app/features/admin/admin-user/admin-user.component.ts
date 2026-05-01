import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
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
      <h2>{{ isEdit() ? 'Edit User' : 'Create User' }}</h2>

      <form (ngSubmit)="save()">
        <div class="field">
          <label>Username</label>
          <input
            type="text"
            [ngModel]="form().username"
            [disabled]="isEdit()"
            name="username"
            (ngModelChange)="update('username', $event)"
            placeholder="Enter username"
          />
        </div>

        <div class="field">
          <label>Password</label>
          <input
            type="password"
            [ngModel]="form().password"
            name="password"
            (ngModelChange)="update('password', $event)"
            placeholder="Enter password",
            autocomplete="one-time-code"
          />
        </div>

        @if (isEdit()) {
          <div class="field checkbox-field">
            <label>
              <input
                type="checkbox"
                [ngModel]="form().resetPin"
                name="resetPin"
                (ngModelChange)="update('resetPin', $event)"
              />
              Reset PIN
            </label>
          </div>
        }

        <div class="field">
          <label>Roles</label>
          <div class="roles-container">
            @for (role of roles(); track role) {
              <div class="role-item">
                <label>
                  <input
                    type="checkbox"
                    [ngModel]="form().roles.includes(role)"
                    [name]="'role-' + role"
                    (ngModelChange)="toggleRole(role)"
                  />
                  {{ role }}
                </label>
              </div>
            }
          </div>
        </div>

        @if (isEdit()) {
          <div class="field checkbox-field">
            <label>
              <input
                type="checkbox"
                [ngModel]="form().enabled"
                name="enabled"
                (ngModelChange)="update('enabled', $event)"
              />
              Enabled
            </label>
          </div>
        }

        <div class="button-group">
          <button type="button" (click)="cancel()">Cancel</button>
          <button type="submit" [disabled]="!canSubmit()">
            {{ isEdit() ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrl: './admin-user.component.css'
})
export class AdminUserComponent {
  private readonly userService = inject(UserService);

  readonly roles = input<string[]>([]);
  readonly initialData = input<UserForm | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly form = signal<UserForm>(this.emptyForm());
  private readonly initialForm = signal<UserForm>(this.emptyForm());

  readonly isEdit = computed(() => this.initialData() !== null);

  readonly canSubmit = computed(() => {
    const f = this.form();
    const dirty = this.isDirty();

    return (
      f.username.trim() !== '' &&
      (this.isEdit() || f.password.trim() !== '') &&
      f.roles.length > 0 &&
      dirty
    );
  });

  readonly isDirty = computed(() => {
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

  constructor() {
    effect(() => {
      const data = this.initialData();

      if (data) {
        this.form.set({
          username: data.username,
          password: data.password,
          roles: [...data.roles].sort((a, b) => a.localeCompare(b)),
          resetPin: data.resetPin,
          enabled: data.enabled
        });

        this.initialForm.set({
          username: data.username,
          password: data.password,
          roles: [...data.roles].sort((a, b) => a.localeCompare(b)),
          resetPin: data.resetPin,
          enabled: data.enabled
        });
      } else {
        const empty = this.emptyForm();
        this.form.set(empty);
        this.initialForm.set(empty);
      }
    });
  }

  private emptyForm(): UserForm {
    return {
      username: '',
      password: '',
      roles: [],
      resetPin: false,
      enabled: true
    };
  }

  update(field: keyof UserForm, value: string | boolean): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  toggleRole(role: string): void {
    this.form.update(f => {
      const roles = f.roles.includes(role)
        ? f.roles.filter(r => r !== role)
        : [...f.roles, role];

      return { ...f, roles: roles.sort((a, b) => a.localeCompare(b)) };
    });
  }

  async save(): Promise<void> {
    const value = this.form();

    if (this.isEdit()) {
      await this.userService.updateUser(value);
    } else {
      await this.userService.createUser(value);
    }

    const empty = this.emptyForm();
    this.form.set(empty);
    this.initialForm.set(empty);
    this.saved.emit();
  }

  cancel(): void {
    const empty = this.emptyForm();
    this.form.set(empty);
    this.initialForm.set(empty);
    this.cancelled.emit();
  }
}