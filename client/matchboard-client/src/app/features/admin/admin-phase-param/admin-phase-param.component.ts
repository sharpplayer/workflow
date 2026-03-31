import { Component, inject, input, output, LOCALE_ID, effect, signal } from '@angular/core';
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
                    [value]="opt.key"
                    [style.color]="opt.value.toLowerCase()"
                  >
                    ● {{ opt.value }}
                  </option>
                }
              </select>
            } @else if (param.type === 'string[]') {
              <div class="param-select-wrapper">
                <ng-select
                  [items]="param.options"
                  bindLabel="value"
                  bindValue="key"
                  [searchable]="true"
                  [clearable]="true"
                  [appendTo]="'body'"
                  placeholder="Select or type..."
                  [(ngModel)]="param.value"
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
  paramsSelected = output<PhaseParamSelected[]>();

  // signal to store params that drive the template
  filteredParams = signal<PhaseParamData[]>([]);

  constructor() {
    effect(() => {
      const params = this.phaseParams();

      if (params?.length) {
        this.initialize(params);
      }
    });
  }

  private async initialize(params: PhaseParam[]) {
    const filtered = params.filter(p => this.isWrappedEvaluation(p));

    const result: PhaseParamData[] = [];

    for (const p of filtered) {
      let options: ConfigItem[] = [];
      let type = p.type ?? null;

      if (p.paramConfig) {
        try {
          const list = await this.configService.getList(p.paramConfig);
          options = list.value;
          type = list.type;
        } catch (err) {
          console.error(`Failed to load list for ${p.paramConfig}`, err);
        }
      }

      const defaults: ConfigItem[] = [];
      if (p.input === 2) {
        defaults.push({ key: '(Job Not Starting)', value: '(Job Not Starting)' });
      }

      const value = p.value ?? '';

      // Ensure current value is in options
      let finalOptions = [...options];
      if (
        value &&
        !finalOptions.some(o => o.key === value) &&
        !defaults.some(d => d.key === value)
      ) {
        finalOptions.unshift({ key: value, value });
      }

      result.push({
        phaseParamId: p.phaseParamId,
        key: p.paramName,
        value,
        paramConfig: p.paramConfig,
        type,
        options: [...defaults, ...finalOptions],
        input: p.input
      });
    }

    // set the signal, template will auto-update
    this.filteredParams.set(result);
  }

  private isWrappedEvaluation(evaluation: PhaseParam): boolean {
    return !!evaluation.evaluation &&
      evaluation.evaluation.trim().startsWith('(') &&
      evaluation.evaluation.trim().endsWith(')');
  }

  onValueChange(id: number, value: string, type?: string) {
    const param = this.filteredParams().find(p => p.phaseParamId === id);
    if (!param) return;

    if (type === 'int') {
      const parsed = Number(value);
      param.value = Number.isInteger(parsed) ? parsed.toString() : '';
    } else if (type === 'boolean') {
      param.value = value ? 'true' : 'false';
    } else {
      param.value = value;
    }

    this.emitChanges();
  }

  onDateChange(id: number, date: Moment | null) {
    const param = this.filteredParams().find(p => p.phaseParamId === id);
    if (!param) return;

    param.value = date ? date.format(UK_DATE_FORMATS.storage) : '';
    this.emitChanges();
  }

  parseDate(value: string): Moment | null {
    if (!value) return null;
    return moment(value, UK_DATE_FORMATS.storage);
  }

  async addItem(param: PhaseParamData) {
    const newValue = prompt('Enter new item:');
    if (!newValue) return;

    try {
      const newItem = await this.configService.addItem(param.paramConfig, newValue);

      param.options = [...param.options, newItem];
      param.value = newItem.key;

      this.emitChanges();
    } catch (err) {
      console.error('Failed to add new item', err);
      alert('Failed to add new item');
    }
  }

  onNgSelectChange(id: number, key: string) {
    const param = this.filteredParams().find(p => p.phaseParamId === id);
    if (!param) return;
    param.value = key;
    this.emitChanges();
  }

  private emitChanges() {
    const selected: PhaseParamSelected[] = this.filteredParams().map(p => ({
      phaseParamId: p.phaseParamId,
      key: p.key,
      value: p.value,
      input: p.input
    }));

    this.paramsSelected.emit(selected);
  }
}