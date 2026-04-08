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
            [ngModel]="usernameValue()"
            (ngModelChange)="onUsernameChange($event)"
            name="username"
            placeholder="Username"
            (blur)="onUsernameBlur()"
            [disabled]="usernameProvided()"
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

            @for (role of availableRoles(); ; track $index) {
              <option [value]="role">{{ role }}</option>
            }
          </select>
        </div>

        <div class="error" [class.visible]="!!displayError()">
          {{ displayError() || '\u00A0' }}
        </div>

        <div class="button-group">
          <button type="submit" [disabled]="!canSubmit()">
            {{ isPinAvailable() ? 'Sign' : (isPin() ? 'Login and Sign' : 'Login') }}
          </button>

          @if (isPin()) {
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
  readonly mode = input<LoginMode>('password');

  /**
   * Parent can pass back session/authentication errors here.
   * Example: "Invalid username or password."
   */
  readonly authError = input('');

  readonly loginSubmit = output<LoginResult>();
  readonly cancelled = output<void>();

  private readonly http = inject(HttpClient);

  readonly usernameValue = signal('');
  readonly credential = signal('');
  readonly selectedRole = signal('');
  readonly loginOptions = signal<LoginOptions>({
    options: [],
    roles: [],
  });
  readonly loadingOptions = signal(false);
  readonly optionsErrorMsg = signal('');
  readonly usernameProvided = signal(false);

  readonly isPin = computed(() => this.mode() === 'pin');

  readonly availableRoles = computed(() => this.loginOptions().roles ?? []);

  readonly isPinAvailable = computed(() =>
    this.isPin() && this.loginOptions().options.includes('pin')
  );

  readonly credentialLabel = computed(() =>
    this.isPinAvailable() ? 'PIN' : 'Password'
  );

  readonly displayError = computed(() =>
    this.authError() || this.optionsErrorMsg()
  );

  readonly canSubmit = computed(() => {
    if (!this.usernameValue().trim()) return false;
    if (!this.credential().trim()) return false;
    if (this.isPinAvailable() && this.credential().length !== 4) return false;
    if (!this.selectedRole()) return false;
    return true;
  });

  constructor() {
    effect(() => {
      this.usernameValue.set(this.username());
      this.usernameProvided.set(!!this.username());
    });

    toObservable(this.usernameValue)
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

        if (roles.length === 0) {
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
    this.usernameValue.set(value);
  }

  onUsernameBlur(): void {
    this.usernameValue.set(this.usernameValue().trim());
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
    this.optionsErrorMsg.set('');
    this.selectedRole.set(value);
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.optionsErrorMsg.set('');

    this.loginSubmit.emit({
      username: this.usernameValue().trim(),
      credential: this.credential(),
      role: this.selectedRole(),
      pin: this.isPinAvailable(),
      pinReset: this.loginOptions().options.includes('pinreset'),
      passwordReset: this.loginOptions().options.includes('reset'),
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
}