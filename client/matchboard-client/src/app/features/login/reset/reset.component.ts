import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResetResult } from '../../../core/services/auth.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-card">
      <h2>{{ isPin() ? 'PIN' : 'Password' }} Reset</h2>

      <div class="field">
        <label>Username</label>
        <input
          type="text"
          [value]="effectiveUsername()"
          disabled
        />
      </div>

      <div class="field">
        <label>{{ credentialLabel() }}</label>
        <input
          type="password"
          [(ngModel)]="credential"
          [placeholder]="credentialLabel()"
          [maxlength]="isPin() ? 4 : 30"
          [pattern]="isPin() ? '[0-9]*' : ''"
          (input)="isPin() && sanitisePin($event)"
          autocomplete="one-time-code"
        />
        <span class="hint">{{ isPin() ? '4-digit PIN' : 'Password' }}</span>
      </div>

      @if (errorMsg()) {
        <div class="error">{{ errorMsg() }}</div>
      }

      <div class="button-group">
        <button
          type="button"
          [disabled]="!canSubmit()"
          (click)="submit()">
          Reset {{ isPin() ? 'PIN' : 'Password' }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './reset.component.css'
})
export class LoginResetComponent {
  private readonly route = inject(ActivatedRoute);

  readonly username = input('');
  readonly mode = input<'password' | 'pin'>('password');

  readonly passwordReset = output<ResetResult>();

  readonly credential = model('');
  readonly errorMsg = signal('');

  private readonly routeUsername = signal<string | null>(null);
  private readonly routeMode = signal<'password' | 'pin' | null>(null);

  readonly effectiveUsername = computed(() =>
    this.routeUsername() ?? this.username()
  );

  readonly effectiveMode = computed<'password' | 'pin'>(() =>
    this.routeMode() ?? this.mode()
  );

  readonly isPin = computed(() => this.effectiveMode() === 'pin');

  readonly credentialLabel = computed(() =>
    this.isPin() ? 'PIN' : 'Password'
  );

  readonly canSubmit = computed(() => {
    const username = this.effectiveUsername().trim();
    const credential = this.credential().trim();

    if (!username || !credential) return false;
    if (this.isPin() && credential.length !== 4) return false;

    return true;
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        this.routeUsername.set(params.get('username'));

        const mode = params.get('mode');
        this.routeMode.set(mode === 'pin' ? 'pin' : mode === 'password' ? 'password' : null);
      });
  }

  sanitisePin(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = value;
    this.credential.set(value);
  }

  submit(): void {
    if (!this.canSubmit()) return;

    this.passwordReset.emit({
      username: this.effectiveUsername(),
      credential: this.credential(),
      pin: this.isPin()
    });
  }
}