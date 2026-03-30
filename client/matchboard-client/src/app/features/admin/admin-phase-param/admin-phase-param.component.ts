import { Component, computed, inject, input, signal, effect, output, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseParam } from '../../../core/services/product.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import moment, { Moment } from 'moment';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';

export const UK_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
  storage: 'YYYY-MM-DD'
};

interface PhaseParamData {
  phaseParamId: number;
  key: string;
  value: string;
  paramConfig: string;
  type: string | null;
  options: ConfigItem[];
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
  imports: [
    CommonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatMomentDateModule,
    NgSelectModule,
    FormsModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'en-GB' },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: MAT_DATE_FORMATS, useValue: UK_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } }
  ],
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
                  <option value="(Job Not Starting)">(Job Not Starting)</option>
                }
                @for (opt of param.options; track opt.key) {
                  <option
                    value="{{ opt.value }}"
                    style="color: {{ opt.value.toLowerCase() }}"
                  >
                    ● {{ opt.value }}
                  </option>
                }
              </select>
            } @else if (param.type === 'string[]') {
              <div class="param-select-wrapper">
                <ng-select
                  [items]="getOptions(param)"
                  bindLabel="value"
                  bindValue="key"
                  [searchable]="true"
                  [clearable]="true"
                  [appendTo]="'body'"
                  placeholder="Select or type..."
                  [(ngModel)]="editedValuesMap[param.phaseParamId]"
                  (ngModelChange)="onNgSelectChange(param.phaseParamId, $event)"
                >
                </ng-select>
                <button type="button" (click)="addItem(param)">+</button>
              </div>
            } @else if (param.type === 'boolean') {
              <input
                type="checkbox"
                [checked]="param.value === 'true'"
                (change)="onValueChange(param.phaseParamId, $any($event.target).checked, 'boolean')"
              />
            } @else if (param.type === 'date') {
              <mat-form-field appearance="fill">
                <input
                  matInput
                  [matDatepicker]="picker"
                  [value]="param.value ? parseDate(param.value) : null"
                  (dateChange)="onDateChange(param.phaseParamId, $event.value)"
                  placeholder="Select a date"
                />
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>
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
        <td colspan="2" class="no-data">No parameters need specifying</td>
      </tr>
    }
  </tbody>
</table>
  `,
  styleUrls: ['./admin-phase-param.component.css']
})
export class AdminPhaseParamComponent {

  private configService = inject(ConfigService);

  phaseParams = input<PhaseParam[]>([]);
  public paramsSelected = output<PhaseParamSelected[]>();

  private editedValues = signal<Record<number, string>>({});
  private inputOptions = signal<Record<string, { values: ConfigItem[], type: string }>>({});

  // Stable object for ng-select two-way binding
  editedValuesMap: Record<number, string> = {};

  filteredParams = computed<PhaseParamData[]>(() => {
    const params = this.phaseParams();
    const edits = this.editedValues();
    const optionsMap = this.inputOptions();

    return params
      .filter(p => this.isWrappedEvaluation(p))
      .map(p => {
        const cfg = optionsMap[p.paramConfig];
        return {
          phaseParamId: p.phaseParamId,
          key: p.paramName,
          value: edits[p.phaseParamId] ?? p.value ?? '',
          paramConfig: p.paramConfig,
          type: cfg?.type ?? p.type ?? null,
          options: cfg?.values ?? [],
          input: p.input
        };
      });
  });

  constructor() {
    // Keep object reference stable for ng-select
    effect(() => {
      const edits = this.editedValues();
      Object.keys(edits).forEach(id => {
        this.editedValuesMap[+id] = edits[+id];
      });
    });

    // Load input options
    effect(() => {
      const params = this.phaseParams();
      if (params.length > 0) {
        this.loadInputOptionsForRawParams(params);
      }
    });

    // Emit selected values upstream
    effect(() => {
      const selected = this.filteredParams().map(p => ({
        phaseParamId: p.phaseParamId,
        key: p.key,
        value: p.value,
        input: p.input
      }));
      this.paramsSelected.emit(selected);
    });
  }

  private async loadInputOptionsForRawParams(params: PhaseParam[]) {
    const filtered = params.filter(p => this.isWrappedEvaluation(p));
    for (const p of filtered) {
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

  onDateChange(id: number, date: Moment | null) {
    const formatted = date ? date.format(UK_DATE_FORMATS.storage) : '';
    this.editedValues.update(v => ({ ...v, [id]: formatted }));
  }

  parseDate(value: string): Moment | null {
    if (!value) return null;
    return moment(value, UK_DATE_FORMATS.storage);
  }

  getOptions(param: PhaseParamData): ConfigItem[] {
    const defaults: ConfigItem[] = [];

    if (param.input === 2) {
      defaults.push({ key: '(Job Not Starting)', value: '(Job Not Starting)' });
    }

    const options = [...(param.options ?? [])];
    const currentValue = param.value;
    if (currentValue && !options.some(o => o.key === currentValue) && !defaults.some(d => d.key === currentValue)) {
      options.unshift({ key: currentValue, value: currentValue });
    }

    return [...defaults, ...options];
  }

  async addItem(param: PhaseParamData) {
    const newValue = prompt('Enter new item:');
    if (!newValue) return;

    try {
      const newItem = await this.configService.addItem(param.paramConfig, newValue);
      this.inputOptions.update(current => {
        const prev = current[param.paramConfig]?.values ?? [];
        return {
          ...current,
          [param.paramConfig]: {
            ...current[param.paramConfig],
            values: [...prev, newItem]
          }
        };
      });
      this.editedValues.update(v => ({ ...v, [param.phaseParamId]: newItem.key }));
    } catch (err) {
      console.error('Failed to add new item', err);
      alert('Failed to add new item');
    }
  }

  onNgSelectChange(id: number, key: string) {
    this.editedValues.update(v => ({ ...v, [id]: key }));
  }
}