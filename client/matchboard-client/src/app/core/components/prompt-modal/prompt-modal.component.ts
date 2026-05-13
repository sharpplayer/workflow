import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="prompt-card" role="dialog" aria-modal="true">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>

      <div class="prompt-actions">
        @if (mode === 'confirm') {
          <button type="button" class="secondary" (click)="resolved.emit(false)">
            {{ cancelText }}
          </button>
        }

        <button type="button" class="primary" (click)="resolved.emit(true)">
          {{ okText }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .prompt-card {
      width: min(420px, calc(100vw - 32px));
      padding: 20px;
      border-radius: 6px;
      background: #fff;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      color: #1f2933;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 20px;
      line-height: 1.25;
    }

    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-line;
    }

    .prompt-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    button {
      min-width: 78px;
      padding: 7px 14px;
      border: none;
      border-radius: 4px;
      font: inherit;
      cursor: pointer;
    }

    .primary {
      background: #4a90e2;
      color: #fff;
    }

    .secondary {
      background: #e5e7eb;
      color: #1f2933;
    }

    button:hover {
      filter: brightness(0.95);
    }
  `]
})
export class PromptModalComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() mode: 'alert' | 'confirm' = 'alert';
  @Input() okText = 'OK';
  @Input() cancelText = 'No';

  @Output() resolved = new EventEmitter<boolean>();
}
