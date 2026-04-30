import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { API_BASE_URL } from '../../../app.config';

export type LoginMode = 'pin' | 'password';
export type LoginOption = 'password' | 'pin' | 'reset' | 'pinreset';

export interface LoginOptions {
  options: LoginOption[];
  roles: string[];
}

export interface LoginResult {
  username: string;
  credential: string;
  role: string;
  pin: boolean;
  pinReset: boolean;
  passwordReset: boolean;
  rpiNumber?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-card">
      <h2>Sign In</h2>

      <form (ngSubmit)="submit()">
        <div class="field">
          <label>Username</label>
          <input
            type="text"
            [ngModel]="displayUsername()"
            (ngModelChange)="onUsernameChange($event)"
            name="username"
            placeholder="Username"
            (blur)="onUsernameBlur()"
            [disabled]="false"
          />
        </div>

        <div class="field">
          <label>{{ credentialLabel() }}</label>
          <input
            type="password"
            [ngModel]="credential()"
            (ngModelChange)="onCredentialChange($event)"
            name="credential"
            [placeholder]="credentialLabel()"
            [maxlength]="isPinAvailable() ? 4 : 30"
            [pattern]="isPinAvailable() ? '[0-9]*' : ''"
            [attr.inputmode]="isPinAvailable() ? 'numeric' : null"
            autocomplete="one-time-code"
          />
          <span class="hint">{{ isPinAvailable() ? '4-digit PIN' : 'Password' }}</span>
        </div>
        @if(rpi()) {
          <div class="field">
            <label>RPI</label>
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              name="rpi"
              class="rpi-input"
              [ngModel]="rpiNumber()"
              (ngModelChange)="onRpiNumberChange($event)"
              (blur)="onRpiNumberBlur()"
            />
          </div>
        }
        @if (roleProvided()) {
          <div class="field">
            <label>Role</label>
            <div class="role-value">{{ constrainedRole() }}</div>
          </div>
        } @else {
          <div class="field">
            <label for="role">Role</label>
            <select
              id="role"
              name="role"
              [ngModel]="selectedRole()"
              (ngModelChange)="onRoleChange($event)"
              [disabled]="availableRoles().length === 0"
            >
              @if (availableRoles().length === 0) {
                <option value="" disabled>(Unavailable)</option>
              }

              @for (role of availableRoles(); track $index) {
                <option [value]="role">{{ role }}</option>
              }
            </select>
          </div>
        }

        <div class="error" [class.visible]="!!displayError()">
          {{ displayError() || '\u00A0' }}
        </div>

        <div class="button-group">
          <button type="submit" [disabled]="!canSubmit()">
            {{ isPinAvailable() ? 'Sign' : (showCancel() ? 'Login and Sign' : 'Login') }}
          </button>

          @if (showCancel()) {
            <button type="button" (click)="cancel()">Cancel</button>
          }
        </div>

        <div class="loading-hint" [class.visible]="loadingOptions()">
          Fetching login options…
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  readonly username = input('');
  readonly role = input('');
  readonly mode = input<LoginMode>('password');
  readonly authError = input('');
  readonly showCancel = input.required<boolean>();
  readonly rpi = input(false);

  readonly loginSubmit = output<LoginResult>();
  readonly cancelled = output<void>();

  private readonly http = inject(HttpClient);

  readonly typedUsername = signal('');
  readonly credential = signal('');
  readonly selectedRole = signal('');
  readonly loginOptions = signal<LoginOptions>({
    options: [],
    roles: [],
  });
  readonly loadingOptions = signal(false);
  readonly rpiNumber = signal('');
  readonly optionsErrorMsg = signal('');

  readonly presetUsername = computed(() => (this.username() ?? '').trim());
  readonly usernameProvided = computed(() => !!this.presetUsername());
  readonly displayUsername = computed(() =>
    this.typedUsername() || this.presetUsername()
  );

  readonly effectiveUsername = computed(() =>
    (this.typedUsername() || this.presetUsername()).trim()
  );

  readonly isPin = computed(() => this.mode() === 'pin');
  readonly constrainedRole = computed(() => (this.role() ?? '').trim());
  readonly roleProvided = computed(() => !!this.constrainedRole());

  readonly availableRoles = computed(() => this.loginOptions().roles ?? []);

  readonly roleAvailableForUser = computed(() => {
    if (!this.roleProvided()) {
      return true;
    }

    const username = this.effectiveUsername();
    if (!username) {
      return true;
    }

    return this.availableRoles().includes(this.constrainedRole());
  });

  readonly isPinAvailable = computed(() =>
    this.isPin() && this.loginOptions().options.includes('pin')
  );

  readonly credentialLabel = computed(() => {
    if (this.isPin() && !this.isPinAvailable()) {
      return 'Password (PIN not set)';
    }
    return this.isPinAvailable() ? 'PIN' : 'Password';
  });

  readonly displayError = computed(() => {
    if (this.authError()) {
      return this.authError();
    }

    if (this.optionsErrorMsg()) {
      return this.optionsErrorMsg();
    }

    if (!this.roleAvailableForUser()) {
      return `User ${this.effectiveUsername()} is not allowed to sign as ${this.constrainedRole()}.`;
    }

    return '';
  });

  readonly validRpiNumber = computed(() => {
    if (!this.rpi()) return true;

    const value = this.rpiNumber().trim();
    return /^\d+$/.test(value);
  });

  readonly canSubmit = computed(() => {
    if (!this.effectiveUsername()) return false;
    if (!this.credential().trim()) return false;
    if (this.isPinAvailable() && this.credential().length !== 4) return false;
    if (this.rpi() && !this.validRpiNumber()) return false;
    if (!this.selectedRole()) return false;
    if (this.roleProvided() && !this.roleAvailableForUser()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      if (this.roleProvided()) {
        this.selectedRole.set(this.constrainedRole());
      }
    });

    toObservable(this.effectiveUsername)
      .pipe(
        map(username => username.trim()),
        distinctUntilChanged(),
        switchMap(username => {
          if (!username) {
            this.loadingOptions.set(false);
            this.optionsErrorMsg.set('');
            return of<LoginOptions>({ options: [], roles: [] });
          }

          this.loadingOptions.set(true);
          this.optionsErrorMsg.set('');
          return this.http
            .get<LoginOptions>(
              `${API_BASE_URL}/api/login-options?username=${encodeURIComponent(username)}`,
              { withCredentials: true }
            )
            .pipe(
              catchError(err => {
                console.error('Login options error:', err);
                this.optionsErrorMsg.set(
                  this.getErrorMessage(err, 'Could not fetch login options.')
                );
                return of<LoginOptions>({ options: [], roles: [] });
              })
            );
        }),
        takeUntilDestroyed()
      )
      .subscribe(options => {
        this.loginOptions.set(options);
        this.loadingOptions.set(false);

        const roles = options.roles ?? [];
        const currentRole = this.selectedRole();

        if (this.roleProvided()) {
          this.selectedRole.set(this.constrainedRole());
        } else if (roles.length === 0) {
          this.selectedRole.set('');
        } else if (!currentRole || !roles.includes(currentRole)) {
          this.selectedRole.set(roles[0]);
        }

        if (!options.options.includes('pin') && this.isPin()) {
          this.credential.set('');
        }
      });
  }

  onUsernameChange(value: string): void {
    this.optionsErrorMsg.set('');
    this.typedUsername.set(value);
  }

  onUsernameBlur(): void {
    this.typedUsername.set(this.typedUsername().trim());
  }

  onCredentialChange(value: string): void {
    this.optionsErrorMsg.set('');

    if (this.isPinAvailable()) {
      this.credential.set(value.replace(/\D/g, '').slice(0, 4));
      return;
    }

    this.credential.set(value);
  }

  onRoleChange(value: string): void {
    if (this.roleProvided()) {
      return;
    }

    this.optionsErrorMsg.set('');
    this.selectedRole.set(value);
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.optionsErrorMsg.set('');

    this.loginSubmit.emit({
      username: this.effectiveUsername(),
      credential: this.credential(),
      role: this.selectedRole(),
      pin: this.isPinAvailable(),
      pinReset: this.loginOptions().options.includes('pinreset'),
      passwordReset: this.loginOptions().options.includes('reset'),
      rpiNumber: this.rpi() ? this.rpiNumber().trim() : undefined,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    const e = err as {
      error?: { message?: string };
      message?: string;
    };

    return e?.error?.message || e?.message || fallback;
  }

  onRpiNumberChange(value: string): void {
    this.optionsErrorMsg.set('');
    this.rpiNumber.set(value.replace(/\D/g, ''));
  }

  onRpiNumberBlur(): void {
    this.rpiNumber.set(this.rpiNumber().trim());
  }
}