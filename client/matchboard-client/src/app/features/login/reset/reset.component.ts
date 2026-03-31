import {
  Component, EventEmitter, Output, OnInit, inject, ChangeDetectorRef,
  Input
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { ResetResult } from "../../../core/services/auth.service";

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-card">
    
      <h2>{{ isPin ? 'PIN' : 'Password' }} Reset</h2>

      <div class="field">
        <label>Username</label>
        <input type="text"
               [value]="username"
               disabled />
      </div>

      <div class="field">
        <label>{{ credentialLabel }}</label>
        <input type="password"
               [(ngModel)]="credential"
               [placeholder]="credentialLabel"
               [maxlength]="isPin ? 4 : 30"
               [pattern]="isPin ? '[0-9]*' : ''"
               (input)="isPin && sanitisePin($event)"
               autocomplete="one-time-code" />
        <span class="hint">{{ isPin ? '4-digit PIN' : 'Password' }}</span>
      </div>

      <div class="error" *ngIf="errorMsg">{{ errorMsg }}</div>

      <div class="button-group">
        <button [disabled]="!canSubmit" (click)="submit()">
          Reset {{ isPin ? 'PIN' : 'Password' }}
        </button>
      </div>

    </div>
  `,
  styleUrls: ['./reset.component.css']
})
export class LoginResetComponent implements OnInit {

  @Input() username: string = '';
  @Input() mode: string = 'password';
  @Output() passwordReset = new EventEmitter<ResetResult>();

  credential = '';
  errorMsg = '';

  private changeRef = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    // Read query params for username and mode
    this.route.queryParamMap.subscribe(params => {
      const user = params.get('username');
      const modeParam = params.get('mode');
      if (user) this.username = user;
      if (modeParam) this.mode = modeParam;
      this.changeRef.detectChanges();
    });
  }

  get isPin(): boolean {
    return this.mode === 'pin';
  }

  get credentialLabel(): string {
    return this.isPin ? 'PIN' : 'Password';
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
    if (!this.canSubmit) return;

    this.passwordReset.emit({
      username: this.username,
      credential: this.credential,
      pin: this.isPin
    });
  }
}