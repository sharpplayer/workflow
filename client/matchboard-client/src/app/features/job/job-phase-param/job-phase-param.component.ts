import {
    Component,
    computed,
    input,
    output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobPartParam } from '../../../core/services/job.service';

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
      <div class="param-signoff" [class.single-operator]="displayOperators().length === 1">
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
    } @else if (isEditableText()) {
      <input
        class="param-input"
        [type]="inputType()"
        [attr.inputmode]="inputMode()"
        [disabled]="disabled()"
        [value]="displayValue()"
        (input)="onInput($event)"
        (blur)="onBlur()"
      />
    } @else {
      <span class="param-label">
        {{ displayValue() || '-' }}
      </span>
    }
  `,
    styleUrl: './job-phase-param.component.css'
})
export class JobPhaseParamComponent {
    readonly param = input.required<JobPartParam>();
    readonly operators = input<LoggedOnOperator[]>([]);
    readonly disabled = input<boolean>(false);

    readonly valueChanged = output<{ param: JobPartParam; value: string }>();
    readonly signoffRequested = output<{ param: JobPartParam; username?: string; role?: string }>();

    readonly isSignoff = computed(() => {
        return !!this.param().config?.startsWith('SIGN(');
    });

    readonly signRole = computed(() => {
        const config = this.param().config ?? '';
        const match = config.match(/^SIGN\((.+)\)$/);
        return match ? match[1].trim() : null;
    });

    readonly matchingOperators = computed(() => {
        const role = this.signRole();
        if (!role) {
            return [];
        }

        return this.operators().filter(operator => operator.role === role);
    });

    readonly displayOperators = computed(() => {
        return this.matchingOperators().map(operator => ({
            key: operator.username,
            username: operator.username,
            label: operator.username,
            role: operator.role
        }));
    });

    readonly isEditableText = computed(() => {
        return !this.disabled() && !this.isSignoff() && this.param().input === 3;
    });

    protected readonly displayValue = computed(() => {
        return this.param().value ?? '';
    });

    requestSignoff(username?: string, role?: string): void {
        this.signoffRequested.emit({
            param: this.param(),
            username,
            role
        });
    }

    inputType(): string {
        const config = (this.param().config ?? '').toLowerCase();

        if (config === 'int' || config === 'float') {
            return 'text';
        }

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
}