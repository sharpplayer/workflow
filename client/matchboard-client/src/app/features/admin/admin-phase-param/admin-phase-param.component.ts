import { Component, computed, inject, input, signal, effect, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam } from '../../../core/services/product.service';
import { ConfigService } from '../../../core/services/config.service';

interface PhaseParamData {
  phaseParamId: number;
  key: string;
  value: string;
  paramConfig: string;
  type: string | null;
  options: string[];
  input: number;
}

export interface PhaseParamSelected {
  phaseParamId: number;
  key: string;
  value: string;
  input: number;
}

@Component({
  selector: 'admin-phase-param',
  standalone: true,
  imports: [CommonModule],
  template: `
<table class="param-table">
  <thead>
    <tr>
      <th>Information</th>
      <th>Details</th>
    </tr>
  </thead>
  <tbody>
    @if (filteredParams().length > 0) {
      @for (param of filteredParams(); track param.phaseParamId) {
        <tr>
          <td>{{ param.key }}</td>
          <td>
            @if (param.type === 'colour[]') {
              <select
                [value]="param.value"
                (change)="onValueChange(param.phaseParamId, $any($event.target).value)"
              >
                @if(param.input === 2){
                  <option 
                    value="(Job Not Starting)" 
                  >
                    (Job Not Starting)
                  </option>
                }
                @for (opt of param.options; track opt) {
                  <option 
                    value="{{ opt }}" 
                    style="color: {{ opt.toLowerCase() }}"
                  >
                    ● {{ opt }}
                  </option>
                }
              </select>
            } @else if (param.type === 'string[]') {
              <select
                [value]="param.value"
                (change)="onValueChange(param.phaseParamId, $any($event.target).value)"
              >
                @if(param.input === 2){
                  <option 
                    value="(Job Not Starting)" 
                  >
                    (Job Not Starting)
                  </option>
                }
                @for (opt of param.options; track opt) {
                  <option value="{{ opt }}">{{ opt }}</option>
                }
              </select>
            } @else if (param.type === 'boolean') {
              <input
                type="checkbox"
                [checked]="param.value === 'true'"
                (change)="onValueChange(param.phaseParamId, $any($event.target).checked, 'boolean')"
              />
            } @else if (param.type === 'int') {
              <input
                type="number"
                step="1"
                [value]="param.value"
                (input)="onValueChange(param.phaseParamId, $any($event.target).value, 'int')"
              />
            } @else {
              <input
                type="text"
                [value]="param.value"
                (input)="onValueChange(param.phaseParamId, $any($event.target).value)"
              />
            }
          </td>
        </tr>
      }
    } @else {
      <tr>
        <td colspan="2" class="no-data">
          No parameters need specifying
        </td>
      </tr>
    }
  </tbody>
</table>
  `,
  styleUrls: ['./admin-phase-param.component.css']
})
export class AdminPhaseParamComponent {

  private configService = inject(ConfigService);

  // reactive input from parent
  phaseParams = input<PhaseParam[]>([]);
  public paramsSelected = output<PhaseParamSelected[]>();

  // store edited values per phaseParamId
  private editedValues = signal<Record<number, string>>({});

  // cache API results per paramConfig
  private inputOptions = signal<Record<string, { values: string[], type: string }>>({});

  // filtered params including type and options
  filteredParams = computed<PhaseParamData[]>(() => {
    const params = this.phaseParams();
    const edits = this.editedValues();
    const optionsMap = this.inputOptions();

    return params
      .filter(p => this.isWrappedEvaluation(p))
      .map(p => {
        const cfg = optionsMap[p.paramConfig];
        let x = {
          phaseParamId: p.phaseParamId,
          key: p.paramName,
          value: edits[p.phaseParamId] ?? p.value ?? '',
          paramConfig: p.paramConfig,
          type: cfg?.type ?? p.type ?? null,
          options: cfg?.values ?? [],
          input: p.input
        };
        console.log("YEEHAH:" + JSON.stringify(x));
        return x;
      });
  });

  constructor() {
    // effect runs in injection context; automatically reloads inputs whenever phaseParams change
    effect(() => {
      if (this.phaseParams().length > 0) {
        this.loadInputs();
      }
    });

    effect(() => {
      const selected = this.filteredParams().map(p => ({
        phaseParamId: p.phaseParamId,
        key: p.key,
        value: this.editedValues()[p.phaseParamId] ?? '',
        input: p.input
      }));
      this.paramsSelected.emit(selected);
    });
  }

  private async loadInputs() {
    const params = this.filteredParams();
    for (const p of params) {
      const key = p.paramConfig;
      if (key !== '' && !this.inputOptions()[key]) {
        try {
          const list = await this.configService.getList(key);
          this.inputOptions.update(current => ({
            ...current,
            [key]: { values: list.value, type: list.type }
          }));
        } catch (err) {
          console.error(`Failed to load list for ${key}`, err);
        }
      }
    }
  }

  private isWrappedEvaluation(evaluation: PhaseParam): boolean {
    return !!evaluation.evaluation &&
      evaluation.evaluation.trim().startsWith('(') &&
      evaluation.evaluation.trim().endsWith(')');
  }

  onValueChange(id: number, value: string, type?: string) {
    let newValue = value;

    if (type === 'int') {
      const parsed = Number(value);
      newValue = Number.isInteger(parsed) ? parsed.toString() : '';
    } else if (type === 'boolean') {
      newValue = value ? 'true' : 'false';
    }

    this.editedValues.update(v => ({ ...v, [id]: newValue }));
  }
}