import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-prompt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="prompt-card" role="dialog" aria-modal="true">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>

      @if (mode === 'input') {
        <input
          class="prompt-input"
          type="text"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          spellcheck="false"
          [(ngModel)]="inputValue"
          (keydown.enter)="resolveInput()"
        />
      }

      <div class="prompt-actions">
        @if (mode === 'confirm' || mode === 'input') {
          <button type="button" class="secondary" (click)="resolved.emit(false)">
            {{ cancelText }}
          </button>
        }

        <button type="button" class="primary" (click)="mode === 'input' ? resolveInput() : resolved.emit(true)">
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

    .prompt-input {
      box-sizing: border-box;
      width: 100%;
      margin-top: 14px;
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font: inherit;
      text-transform: uppercase;
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
  @Input() mode: 'alert' | 'confirm' | 'input' = 'alert';
  @Input() okText = 'OK';
  @Input() cancelText = 'No';
  @Input() inputValue = '';

  @Output() resolved = new EventEmitter<boolean | string>();

  resolveInput(): void {
    this.resolved.emit(this.inputValue.trim());
  }
}
