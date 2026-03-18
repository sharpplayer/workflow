import {
  Component, EventEmitter, Input, Output, OnInit, OnDestroy,
  inject, signal
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Subject, switchMap, catchError, of, map } from "rxjs";
import { API_BASE_URL } from "../../../app.config";

export type LoginMode = 'pin' | 'password';
export type LoginOption = 'admin' | 'password' | 'pin' | 'reset' | 'pinreset';

export interface LoginResult {
  username: string;
  credential: string;
  adminMode: boolean;
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
          <input type="text"
                 [(ngModel)]="username"
                 name="username"
                 placeholder="Username"
                 (blur)="onUsernameBlur()"
                 [disabled]="usernameProvided" />
        </div>

        <div class="field">
          <label>{{ credentialLabel }}</label>
          <input type="password"
                 [(ngModel)]="credential"
                 name="credential"
                 [placeholder]="credentialLabel"
                 [maxlength]="isPinAvailable ? 4 : 30"
                 [pattern]="isPinAvailable ? '[0-9]*' : ''"
                 (input)="isPinAvailable && sanitisePin($event)"
                 autocomplete="one-time-code" />
          <span class="hint">{{ isPinAvailable ? '4-digit PIN' : 'Password' }}</span>
        </div>

        <div class="field checkbox-field" *ngIf="!isPin">
          <label [class.disabled]="!isAdminAvailable">
            <input type="checkbox"
                   [(ngModel)]="adminMode"
                   name="adminMode"
                   [disabled]="!isAdminAvailable" />
            Admin mode
          </label>
        </div>

        <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>

        <div class="button-group">
          <button type="submit" [disabled]="!canSubmit">
            {{ isPinAvailable ? 'Sign' : (isPin ? 'Login and Sign' : 'Login') }}
          </button>
          <button type="button" (click)="cancel()" *ngIf="isPin">Cancel</button>
        </div>

        <div class="loading-hint" [class.visible]="loadingOptions()">Fetching login options…</div>

      </form>
    </div>
  `,
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  @Input() username: string = '';
  @Input() mode: LoginMode = 'password';
  @Output() loginSubmit = new EventEmitter<LoginResult>();
  @Output() cancelled = new EventEmitter<void>();

  credential = '';
  adminMode = false;
  usernameProvided = false;
  loginOptions: LoginOption[] = [];
  loadingOptions = signal(false);
  errorMsg = '';

  private http = inject(HttpClient);
  private usernameSubject = new Subject<string>();
  private sub = this.usernameSubject.pipe(
    switchMap(u => {
      if (!u) {
        this.loginOptions = [];
        this.adminMode = false;
        return of([] as LoginOption[]);
      }
      this.loadingOptions.set(true);
      this.errorMsg = '';
      return this.http.get<{ options: string[] }>(
        `${API_BASE_URL}/api/login-options?username=${encodeURIComponent(u)}`,
        { withCredentials: true }
      ).pipe(
        map(response => {
          this.loadingOptions.set(false);
          return response.options as LoginOption[];
        }),
        catchError(err => {
          console.error('Login options error:', err);
          this.loadingOptions.set(false);
          this.errorMsg = 'Could not fetch login options.';
          return of([] as LoginOption[]);
        })
      );
    })
  ).subscribe(opts => {
    this.loginOptions = opts;
    this.loadingOptions.set(false);
    if (!this.isAdminAvailable) this.adminMode = false;
  });

  ngOnInit(): void {
    this.usernameProvided = !!this.username;
    if (this.usernameProvided) {
      this.usernameSubject.next(this.username);
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  onUsernameBlur() {
    this.usernameSubject.next(this.username);
  }

  get isAdminAvailable(): boolean {
    return this.loginOptions.includes('admin');
  }

  get isPinAvailable(): boolean {
    return this.isPin && this.loginOptions.includes('pin');
  }

  get isPin(): boolean {
    return this.mode === 'pin';
  }

  get credentialLabel(): string {
    return this.isPinAvailable ? 'PIN' : 'Password';
  }

  sanitisePin(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    this.credential = input.value;
  }

  get canSubmit(): boolean {
    if (!this.username) return false;
    if (!this.credential) return false;
    if (this.isPinAvailable && this.credential.length !== 4) return false;
    return true;
  }

  submit() {
    this.loginSubmit.emit({
      username: this.username,
      credential: this.credential,
      adminMode: this.adminMode,
      pin: this.isPinAvailable,
      pinReset: this.loginOptions.includes('pinreset'),
      passwordReset: this.loginOptions.includes('reset')
    });
  }

  cancel() {
    this.cancelled.emit();
  }
}