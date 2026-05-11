import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobPartParam, JobService, ParamStatus } from '../../../core/services/job.service';
import { DeviceService } from '../../../core/services/device.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';
import { API_BASE_URL } from '../../../app.config';

type CheckVisualState = 'neutral' | 'matching' | 'unmatching';
type ParamValueState = 'disabled' | 'required' | 'complete' | 'neutral';

export interface LoggedOnOperator {
  username: string;
  role: string;
}

@Component({
  selector: 'job-phase-param',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isSignoff()) {
      @if (isAlreadySigned()) {
        <div class="param-signoff signed" [ngClass]="valueStateClass()">
          <div class="signed-label signoff-operator-button signed">
            SIGNED<br />
            {{ signedBy() }}
          </div>
        </div>
      } @else {
        <div
          class="param-signoff"
          [ngClass]="valueStateClass()"
          [class.single-operator]="displayOperators().length === 1">
          @if (displayOperators().length > 0) {
            <div class="signoff-operator-list">
              @for (operator of displayOperators(); track operator.key) {
                <button
                  type="button"
                  class="signoff-operator-button"
                  [disabled]="disabled()"
                  (click)="requestSignoff(operator.username, operator.role)">
                  {{ operator.label }}
                </button>
              }
            </div>
          } @else if (signRole(); as role) {
            <div class="signoff-operator-list">
              <button
                type="button"
                class="signoff-operator-button"
                [disabled]="disabled()"
                (click)="requestSignoff(undefined, role)">
                Any<br />{{ role }}
              </button>
            </div>
          } @else {
            <div class="param-empty">No signoff role configured</div>
          }
        </div>
      }
    } @else if (isCheck()) {
      @if (disabled()) {
        <span class="param-label" [ngClass]="valueStateClass()">
          {{ displayValue() || '-' }}
        </span>
      } @else {
        <div
          class="check-cell"
          [ngClass]="valueStateClass()"
          [class.check-cell--matching]="checkVisualState() === 'matching'"
          [class.check-cell--unmatching]="checkVisualState() === 'unmatching'"
          [class.check-cell--editing]="isEditingCheck()">
          @if (!isEditingCheck()) {
            <div class="check-review">
              <span class="check-review__value">{{ displayValue() || '-' }}</span>

              <div class="check-review__actions">
                <button
                  type="button"
                  class="check-review__btn check-review__btn--tick"
                  aria-label="Accept value"
                  [disabled]="!canAcceptCheck()"
                  (click)="acceptCheckValue()">
                  ✓
                </button>

                <button
                  type="button"
                  class="check-review__btn check-review__btn--cross"
                  aria-label="Reject value and edit"
                  (click)="startEditingCheck()">
                  ✕
                </button>
              </div>
            </div>
          } @else {
            <input
              #checkInput
              class="param-input check-input"
              [ngClass]="valueStateClass()"
              [type]="checkInputType()"
              [attr.inputmode]="checkInputMode()"
              [value]="displayValue()"
              (input)="onCheckInput($event)"
              (blur)="finishEditingCheck(checkInput.value)"
            />
          }
        </div>
      }
    } @else if (isWastage()) {
      <div
        class="wastage-cell"
        [ngClass]="valueStateClass()"
        [class.wastage-cell--yes]="!disabled() && isWastageYes()"
        [class.wastage-cell--no]="!disabled() && isWastageNo()">

        @if (disabled()) {
          <span class="param-label">
            {{ displayValue() || '-' }}
          </span>
        } @else if (isWastageYes()) {
          <button
            type="button"
            class="wastage-btn wastage-btn--danger wastage-btn--selected"
            (click)="requestWastage()">
            ADD
          </button>
        } @else {
          <button
            type="button"
            class="wastage-btn wastage-btn--danger"
            (click)="selectWastageYes()">
            YES
          </button>

          <button
            type="button"
            class="wastage-btn wastage-btn--success"
            [class.wastage-btn--selected]="isWastageNo()"
            (click)="selectWastageNo()">
            NO
          </button>
        }
      </div>
    } @else if (isPhoto()) {
      <div class="photo-cell" [ngClass]="valueStateClass()">
        <button
          type="button"
          class="photo-button"
          [disabled]="disabled() || photoUploading()"
          (click)="requestPhoto()">
          @if (displayValue()) {
            <img class="photo-preview" [src]="photoUrl()" alt="Captured photo" />
          } @else {
            📷<br />
            {{ photoUploading() ? 'Uploading...' : 'Take photo' }}
          }
        </button>
      </div>
    } @else if (isSelect()) {
      <div class="select-cell" [ngClass]="valueStateClass()">
        <select
          class="param-input param-select"
          [disabled]="disabled() || selectLoading()"
          [value]="displayValue()"
          (change)="onSelectChange($event)">
          <option value="" disabled>
            {{ selectLoading() ? 'Loading...' : 'Select...' }}
          </option>

          @for (opt of selectOptions(); track opt.key) {
            <option [value]="opt.key">
              {{ opt.value }}
            </option>
          }
        </select>

        @if (isColourSelect() && selectedColourValue(); as colour) {
          @if (!colour.startsWith('(')) {
            <span
              class="colour-box"
              [style.background-color]="colour.toLowerCase()">
            </span>
          }
        }
      </div>
    } @else if (isBoolean()) {
      <div class="boolean-cell" [ngClass]="valueStateClass()">
        @if (disabled()) {
          <span class="param-label param-label--disabled">
            {{ displayValue() || '-' }}
          </span>
        } @else {
          <button
            type="button"
            class="check-review__btn check-review__btn--tick"
            [class.check-review__btn--selected]="isBooleanYes()"
            (click)="setBooleanValue('YES')">
            ✓
          </button>

          <button
            type="button"
            class="check-review__btn check-review__btn--cross"
            [class.check-review__btn--selected]="isBooleanNo()"
            (click)="setBooleanValue('NO')">
            ✕
          </button>
        }
      </div>
    } @else if (isEditableText()) {
      <input
        class="param-input"
        [ngClass]="valueStateClass()"
        [type]="inputType()"
        [attr.inputmode]="inputMode()"
        [disabled]="disabled()"
        [value]="displayValue()"
        (input)="onInput($event)"
        (blur)="onBlur()"
      />
    } @else {
      <span class="param-label" [ngClass]="valueStateClass()">
        {{ displayValue() || '-' }}
      </span>
    }
  `,
  styleUrl: './job-phase-param.component.css'
})
export class JobPhaseParamComponent {
  private readonly deviceService = inject(DeviceService);
  private readonly configService = inject(ConfigService);
  private readonly jobService = inject(JobService);

  @ViewChild('checkInput')
  private checkInputRef?: ElementRef<HTMLInputElement>;

  readonly photoUploading = input<boolean>(false);
  readonly jobNumber = input<number>(0);
  readonly jobPart = input<number>(0);

  readonly param = input.required<JobPartParam>();
  readonly currentValue = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly excludedUsernames = input<string[]>([]);
  readonly machineName = input<string | null>(null);
  readonly valueState = input<ParamValueState>('neutral');

  readonly valueChanged = output<{ param: JobPartParam; value: string }>();
  readonly signoffRequested = output<{ param: JobPartParam; username?: string; role?: string }>();
  readonly checkStatusChanged = output<{ param: JobPartParam; status: ParamStatus; value: string }>();
  readonly wastageRequested = output<{ param: JobPartParam }>();
  readonly photoRequested = output<{ param: JobPartParam }>();

  readonly editingCheck = signal(false);
  readonly checkOriginalValue = signal('');
  readonly checkVisualState = signal<CheckVisualState>('neutral');

  readonly selectOptions = signal<ConfigItem[]>([]);
  readonly selectType = signal<string | null>(null);
  readonly selectLoading = signal(false);

  constructor() {
    effect(() => {
      const param = this.param();

      if (!this.isSelect()) {
        this.selectOptions.set([]);
        this.selectType.set(null);
        return;
      }

      void this.loadSelectOptions(param);
    });
  }

  valueStateClass(): string {
    return `param-state--${this.valueState()}`;
  }

  readonly isSignoff = computed(() => {
    const config = this.param().config ?? '';
    return config.startsWith('SIGN(') || config.startsWith('AWAIT(');
  });

  readonly isCheck = computed(() => {
    return !!this.param().config?.startsWith('CHECK(');
  });

  readonly isWastage = computed(() => {
    return (this.param().config ?? '').trim().toUpperCase() === 'WASTAGE';
  });

  readonly isPhoto = computed(() =>
    (this.param().config ?? '').trim().toUpperCase() === 'PHOTO'
  );

  readonly isSelect = computed(() => {
    const config = (this.param().config ?? '').trim();

    if (this.param().value) {
      return false;
    }

    if (!config) {
      return false;
    }

    const normalized = config.toLowerCase();

    const primitive =
      config.includes('(') ||
      normalized === 'photo' ||
      normalized === 'string' ||
      normalized === 'int' ||
      normalized === 'float' ||
      normalized === 'boolean';

    return (
      !primitive &&
      !this.isSignoff() &&
      !this.isCheck() &&
      !this.isWastage() &&
      this.param().input === 3
    );
  });

  readonly isColourSelect = computed(() => {
    return this.selectType() === 'colour[]';
  });

  readonly selectedColourValue = computed(() => {
    const selectedKey = this.displayValue();

    if (!selectedKey) {
      return null;
    }

    const selected = this.selectOptions().find(opt => opt.key === selectedKey);
    return selected?.value ?? null;
  });

  readonly wastageValue = computed(() => {
    return this.displayValue().trim().toUpperCase();
  });

  readonly isWastageYes = computed(() => this.wastageValue() === 'YES');
  readonly isWastageNo = computed(() => this.wastageValue() === 'NO');

  readonly signRole = computed(() => {
    const config = this.param().config ?? '';
    const match = config.match(/^(SIGN|AWAIT)\((.+)\)$/);
    return match ? match[2].trim() : null;
  });

  readonly displayValue = computed(() => {
    return this.currentValue() ?? '';
  });

  readonly isAlreadySigned = computed(() => {
    return this.isSignoff() && this.displayValue().trim() !== '';
  });

  readonly signedBy = computed(() => {
    return this.displayValue().trim();
  });

  readonly photoUrl = computed(() => {
    const phase = this.param().phaseNumber;
    const paramId = this.param().partParamId;
    const jobNumber = this.jobNumber();
    const jobPart = this.jobPart();

    return `${API_BASE_URL}/api/jobs/${jobNumber}/part/${jobPart}/phase/${phase}/param/${paramId}`;
  });

  readonly matchingOperators = computed(() => {
    const role = this.signRole()?.trim().toLowerCase();

    if (!role) {
      return [];
    }

    const excluded = new Set(
      this.excludedUsernames().map(username => username.trim().toLowerCase())
    );

    return this.deviceService.status()?.users.filter(operator =>
      operator.role.trim().toLowerCase() === role &&
      !excluded.has(operator.user.trim().toLowerCase())
    ) ?? [];
  });

  readonly displayOperators = computed(() => {
    return this.matchingOperators().map(operator => ({
      key: operator.user,
      username: operator.user,
      label: operator.user,
      role: operator.role
    }));
  });

  readonly isBoolean = computed(() => {
    return (this.param().config ?? '').trim().toLowerCase() === 'boolean';
  });

  readonly booleanValue = computed(() => {
    return this.displayValue().trim().toUpperCase();
  });

  readonly isBooleanYes = computed(() => this.booleanValue() === 'YES');
  readonly isBooleanNo = computed(() => this.booleanValue() === 'NO');

  readonly isEditableText = computed(() => {
    return (
      !this.disabled() &&
      !this.isSelect() &&
      !this.isSignoff() &&
      !this.isCheck() &&
      !this.isBoolean() &&
      !this.isWastage() &&
      !this.isPhoto() &&
      this.param().input === 3
    );
  });

  private async loadSelectOptions(param: JobPartParam): Promise<void> {
    let paramConfig = param.config;

    if (!paramConfig) {
      this.selectOptions.set([]);
      this.selectType.set(null);
      return;
    }

    this.selectLoading.set(true);

    try {
      if (paramConfig === 'OPERATOR') {
        paramConfig = paramConfig + '(' + this.machineName() + ')';
      }

      const list = await this.configService.getList(paramConfig);

      this.selectOptions.set(list.value ?? []);
      this.selectType.set(list.type);
    } catch (err) {
      console.error(`Failed to load list for ${paramConfig}`, err);
      this.selectOptions.set([]);
      this.selectType.set(null);
    } finally {
      this.selectLoading.set(false);
    }
  }

  requestPhoto(): void {
    if (this.disabled() || this.photoUploading()) {
      return;
    }

    this.photoRequested.emit({
      param: this.param()
    });
  }

  onSelectChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.valueChanged.emit({
      param: this.param(),
      value: select.value
    });
  }

  selectWastageYes(): void {
    if (this.disabled()) {
      return;
    }

    this.wastageRequested.emit({
      param: this.param()
    });
  }

  selectWastageNo(): void {
    if (this.disabled()) {
      return;
    }

    this.valueChanged.emit({
      param: this.param(),
      value: 'NO'
    });
  }

  requestWastage(): void {
    if (this.disabled()) {
      return;
    }

    this.wastageRequested.emit({
      param: this.param()
    });
  }

  requestSignoff(username?: string, role?: string): void {
    this.signoffRequested.emit({
      param: this.param(),
      username,
      role
    });
  }

  isEditingCheck(): boolean {
    return this.editingCheck();
  }

  canAcceptCheck(): boolean {
    if (this.checkVisualState() !== 'unmatching') {
      return true;
    }

    return this.displayValue() === this.checkOriginalValue();
  }

  acceptCheckValue(): void {
    if (this.isEditingCheck()) {
      const rawValue = this.getOpenCheckInputValue();
      this.finishEditingCheck(rawValue);
      return;
    }

    if (!this.canAcceptCheck()) {
      return;
    }

    const value = this.displayValue();

    if (!this.checkOriginalValue()) {
      this.checkOriginalValue.set(value);
    }

    this.editingCheck.set(false);
    this.checkVisualState.set('matching');

    this.checkStatusChanged.emit({
      param: this.param(),
      status: ParamStatus.MATCHING,
      value
    });
  }

  startEditingCheck(): void {
    if (this.isEditingCheck()) {
      const rawValue = this.getOpenCheckInputValue();
      this.finishEditingCheck(rawValue);
      return;
    }

    if (this.checkVisualState() !== 'unmatching') {
      this.checkOriginalValue.set(this.displayValue());
    }

    this.editingCheck.set(true);
    this.checkVisualState.set('unmatching');

    this.checkStatusChanged.emit({
      param: this.param(),
      status: ParamStatus.UNMATCHING,
      value: this.displayValue()
    });
  }

  finishEditingCheck(rawValue: string): void {
    const cleaned = this.cleanCheckValue(rawValue);
    const original = this.checkOriginalValue();
    const isMatch = cleaned === original;

    this.editingCheck.set(false);
    this.checkVisualState.set(isMatch ? 'matching' : 'unmatching');

    this.valueChanged.emit({
      param: this.param(),
      value: cleaned
    });

    this.checkStatusChanged.emit({
      param: this.param(),
      status: isMatch ? ParamStatus.MATCHING : ParamStatus.UNMATCHING,
      value: cleaned
    });
  }

  onCheckInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = this.cleanCheckValue(input.value);

    if (input.value !== cleaned) {
      input.value = cleaned;
    }

    this.valueChanged.emit({
      param: this.param(),
      value: cleaned
    });
  }

  checkInputType(): string {
    return this.isCheckIntegerMode() ? 'number' : 'text';
  }

  checkInputMode(): string {
    return this.isCheckIntegerMode() ? 'numeric' : 'text';
  }

  private isCheckIntegerMode(): boolean {
    return this.isIntLike(this.checkOriginalValue());
  }

  private cleanCheckValue(value: string): string {
    const raw = String(value ?? '');

    if (this.isCheckIntegerMode()) {
      if (raw === '' || raw === '-') {
        return raw;
      }

      const parsed = parseInt(raw, 10);
      return Number.isNaN(parsed) ? '' : String(parsed);
    }

    return raw;
  }

  private getOpenCheckInputValue(): string {
    return this.checkInputRef?.nativeElement.value ?? this.displayValue();
  }

  inputType(): string {
    return 'text';
  }

  inputMode(): string {
    const config = (this.param().config ?? '').toLowerCase();

    if (config === 'int') {
      return 'numeric';
    }

    if (config === 'float') {
      return 'decimal';
    }

    return 'text';
  }

  onValueChange(value: string): void {
    const config = (this.param().config ?? '').toLowerCase();

    let cleaned = value;

    if (config === 'int') {
      cleaned = value.replace(/[^\d]/g, '');
    }

    if (config === 'float') {
      cleaned = value
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');
    }

    this.valueChanged.emit({
      param: this.param(),
      value: cleaned
    });
  }

  onBlur(): void {
    const config = (this.param().config ?? '').toLowerCase();

    if (config === 'float') {
      const value = parseFloat(this.displayValue());

      if (!isNaN(value)) {
        this.onValueChange(value.toString());
      }
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const config = (this.param().config ?? '').toLowerCase();

    let cleaned = input.value;

    if (config === 'int') {
      cleaned = cleaned.replace(/[^\d]/g, '');
    }

    if (config === 'float') {
      cleaned = cleaned
        .replace(/[^\d.]/g, '')
        .replace(/(\..*)\./g, '$1');
    }

    if (input.value !== cleaned) {
      input.value = cleaned;
    }

    this.valueChanged.emit({
      param: this.param(),
      value: cleaned
    });
  }

  isIntLike(value: string | null | undefined): boolean {
    if (value == null) {
      return false;
    }

    return /^-?\d+$/.test(String(value).trim());
  }

  setBooleanValue(value: 'YES' | 'NO'): void {
    if (this.disabled()) {
      return;
    }

    this.valueChanged.emit({
      param: this.param(),
      value
    });
  }
}