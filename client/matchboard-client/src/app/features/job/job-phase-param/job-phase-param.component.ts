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
        <div class="param-signoff" [class.single-operator]="operators().length === 1">
            @if (operators().length > 0) {
          <div class="signoff-operator-list">
            @for (operator of operators(); track operator.username) {
              <button
                type="button"
                class="signoff-operator-button"
                [disabled]="disabled()"
                (click)="requestSignoff(operator.username)">
                {{ operator.username }}
              </button>
            }
          </div>
        } @else {
          <div class="param-empty">No operators logged on</div>
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
    readonly signoffRequested = output<{ param: JobPartParam; username: string }>();

    readonly isSignoff = computed(() => {
        return !!this.param().config?.startsWith('SIGN(');
    });

    readonly isEditableText = computed(() => {
        return !this.disabled() && !this.isSignoff() && this.param().input === 3;
    });

    protected readonly displayValue = computed(() => {
        return this.param().value ?? ''
    });

    requestSignoff(username: string): void {
        this.signoffRequested.emit({
            param: this.param(),
            username
        });
    }

    inputType(): string {
        const config = (this.param().config ?? '').toLowerCase();

        if (config === 'int' || config === 'float') {
            return 'text'; // IMPORTANT: use text, not number (better control)
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
                .replace(/(\..*)\./g, '$1'); // only one dot
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