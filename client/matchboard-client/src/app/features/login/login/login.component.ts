import {
  Component, EventEmitter, Input, Output, OnInit, OnDestroy,
  SimpleChanges, OnChanges,
  inject,
  ChangeDetectorRef
} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Subject, switchMap, catchError, of, map } from "rxjs";
import { API_BASE_URL } from "../../../app.config";

export type LoginMode = 'pin' | 'password';
export type LoginOption = 'admin' | 'password' | 'pin' | 'reset';

export interface LoginResult {
  username: string;
  credential: string;
  adminMode: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-card">
      <h2>Sign In</h2>

      <!-- Username: dropdown if users supplied, else free text -->
      <div class="field">
        <label>Username</label>
        <select *ngIf="users.length; else freeText"
                [(ngModel)]="username"
                (blur)="onUsernameBlur()">
          <option value="" disabled>Select user…</option>
          <option *ngFor="let u of users" [value]="u">{{ u }}</option>
        </select>

        <ng-template #freeText>
          <input type="text"
                 [(ngModel)]="username"
                 placeholder="Username"
                 (blur)="onUsernameBlur()" />
        </ng-template>
      </div>

      <!-- Credential input — always visible -->
      <div class="field">
        <label>{{ credentialLabel }}</label>
        <input [type]="credentialInputType"
               [(ngModel)]="credential"
               [placeholder]="credentialLabel"
               [maxlength]="isPin ? 4 : 524288"
               [pattern]="isPin ? '[0-9]*' : ''"
               (input)="isPin && sanitisePin($event)"
               autocomplete="current-password" />
        <span class="hint" *ngIf="isPin">4-digit PIN</span>
      </div>

      <!-- Admin checkbox — always visible, enabled only when admin option present -->
      <div class="field checkbox-field">
        <label [class.disabled]="!isAdminAvailable">
          <input type="checkbox"
                 [(ngModel)]="adminMode"
                 [disabled]="!isAdminAvailable" />
          Admin mode
        </label>
      </div>

      <div class="loading-hint" *ngIf="loadingOptions">Fetching login options…</div>
      <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>

      <button [disabled]="!canSubmit" (click)="submit()">Login</button>
    </div>
  `,
  styles: [`
    .modal-card { display:flex; flex-direction:column; gap:1rem; padding:2rem; max-width:360px; }
    .field { display:flex; flex-direction:column; gap:.4rem; }
    .checkbox-field { flex-direction:row; align-items:center; }
    .hint { font-size:.75rem; color:#888; }
    .loading-hint { font-size:.8rem; color:#aaa; }
    .error { color:red; font-size:.85rem; }
    label.disabled { opacity:.4; cursor:not-allowed; }
  `]
})
export class LoginComponent implements OnChanges, OnDestroy {

  @Input() users: string[] = [];
  @Input() mode: LoginMode = 'password';
  @Output() loginSubmit = new EventEmitter<LoginResult>();

  username = '';
  credential = '';
  adminMode = false;

  loginOptions: LoginOption[] = [];
  loadingOptions = false;
  errorMsg = '';

  private http = inject(HttpClient);
  private changeRef = inject(ChangeDetectorRef);

  private usernameSubject = new Subject<string>();
  private sub = this.usernameSubject.pipe(
    switchMap(u => {
      if (!u) {
        this.loginOptions = [];
        this.adminMode = false;
        return of([] as LoginOption[]);
      }
      this.loadingOptions = true;
      this.errorMsg = '';
      return this.http.get<{ options: string[] }>(`${API_BASE_URL}/api/login-options?username=${encodeURIComponent(u)}`).pipe(
        map(response => {
          this.loadingOptions = false;
          console.log('API responded at', new Date().toISOString(), response);
          this.changeRef.detectChanges();
          return response.options as LoginOption[]
        }),
        catchError(err => {
          console.error('Login options error:', err);
          this.loadingOptions = false;
          this.errorMsg = 'Could not fetch login options.';
          this.changeRef.detectChanges();
          return of([] as LoginOption[]);
        })
      );
    })
  ).subscribe(opts => {
    const valid: LoginOption[] = ['admin', 'password', 'pin', 'reset'];
    this.loginOptions = opts.filter(o => valid.includes(o));
    this.loadingOptions = false;
    if (!this.isAdminAvailable) this.adminMode = false;
    this.changeRef.detectChanges();
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['users'] && this.users.length === 1) {
      this.username = this.users[0];
      this.onUsernameBlur();
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

  get isPin(): boolean {
    return this.mode === 'pin' && this.loginOptions.includes('pin');
  }

  get credentialLabel(): string {
    return this.isPin ? 'PIN' : 'Password';
  }

  get credentialInputType(): string {
    return 'password';
  }

  sanitisePin(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    this.credential = input.value;
  }

  get canSubmit(): boolean {
    if (!this.username) return false;
    if (!this.credential) return false;
    if (this.isPin && this.credential.length !== 4) return false;
    return true;
  }

  submit() {
    this.loginSubmit.emit({
      username: this.username,
      credential: this.credential,
      adminMode: this.adminMode
    });
  }
}