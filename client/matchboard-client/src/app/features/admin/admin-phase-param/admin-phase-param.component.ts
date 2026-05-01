import { Component, inject, input, output, LOCALE_ID, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';

import moment, { Moment } from 'moment';
import { NgSelectModule } from '@ng-select/ng-select';

import { PhaseParam } from '../../../core/services/product.service';
import { ConfigItem, ConfigService } from '../../../core/services/config.service';
import { AdminCarrierComponent, CarrierFormModel } from '../admin-carrier/admin-carrier.component';
import { ParamStatus } from '../../../core/services/job.service';

export interface PhaseParamValidationError {
  phaseParamId: number;
  message: string;
}

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
  phaseId: number;
  phaseParamId: number;
  phaseNumber: number;
  key: string;
  value: string;
  paramConfig: string;
  type: string | null;
  options: ConfigItem[];
  input: number;
  searchable: boolean;
  editable: boolean;
  optional: boolean;
  status: ParamStatus;
}

export interface PhaseParamSelected {
  phaseId: number;
  phaseParamId: number;
  phaseNumber: number;
  key: string;
  value: string;
  input: number;
}

@Component({
  selector: 'admin-phase-param',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatMomentDateModule,
    NgSelectModule,
    AdminCarrierComponent
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'en-GB' },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
    { provide: MAT_DATE_FORMATS, useValue: UK_DATE_FORMATS },
    { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } }
  ],
  template: `
<table>
  <thead>
    <tr>
      <th class="col-small">Information</th>
      <th class="col-big">Details</th>
      <th class="col-medium"></th>
    </tr>
  </thead>
  <tbody>
    @if (filteredParams().length > 0) {
      @for (param of filteredParams(); track param.phaseParamId) {
        <tr>
          <td>{{ param.key }}</td>
          <td>
            @if (param.type === 'colour[]') {
              <mat-form-field appearance="fill" class="param-field">
                <mat-select
                  [ngModel]="param.value"
                  (ngModelChange)="onValueChange(param.phaseParamId, $event)"
                >
                  @for (opt of param.options; track opt.key) {
                    <mat-option [value]="opt.key">
                      <span class="colour-option">
                        @if (!opt.value.startsWith('(')) {
                          <span
                            class="colour-dot"
                            [style.background-color]="opt.value.toLowerCase()"
                          ></span>
                        }
                        <span>{{ opt.value }}</span>
                      </span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else if (param.type === 'string[]' && param.searchable) {
              <div class="param-select-wrapper">
                <div class="param-field ng-select-field">
                  <ng-select
                    [items]="param.options"
                    bindLabel="value"
                    bindValue="key"
                    [searchable]="true"
                    [clearable]="true"
                    [appendTo]="'body'"
                    placeholder="Select or type..."
                    [ngModel]="param.value"
                    (ngModelChange)="onNgSelectChange(param.phaseParamId, $event)"
                  >
                  </ng-select>
                </div>

                @if (param.editable) {
                  <button
                    mat-icon-button
                    type="button"
                    aria-label="Add item"
                    (click)="addItem(param)"
                  >
                    <mat-icon>add</mat-icon>
                  </button>
                }
              </div>
            } @else if (param.type === 'string[]') {
              <mat-form-field appearance="fill" class="param-field">
                <mat-select
                  [ngModel]="param.value"
                  (ngModelChange)="onValueChange(param.phaseParamId, $event)"
                >
                  @for (opt of param.options; track opt.key) {
                    <mat-option [value]="opt.key">
                      {{ opt.value }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else if (param.type === 'boolean') {
              <mat-checkbox
                [ngModel]="param.value === 'true'"
                (ngModelChange)="onValueChange(param.phaseParamId, $event, 'boolean')"
              >
              </mat-checkbox>
            } @else if (param.type === 'date') {
              <mat-form-field appearance="fill" class="param-field">
                <input
                  matInput
                  [matDatepicker]="picker"
                  [value]="param.value ? parseDate(param.value) : null"
                  (dateChange)="onDateChange(param.phaseParamId, $event.value)"
                  placeholder="Select a date"
                />
                @if (param.optional) {
                  <button
                    matSuffix
                    mat-icon-button
                    class="clear-date-btn"
                    type="button"
                    (click)="clearDate(param.phaseParamId)"
                    aria-label="Clear date"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                }
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>
            } @else if (param.type === 'int') {
              <mat-form-field appearance="fill" class="param-field">
                <input
                  matInput
                  type="number"
                  step="1"
                  [ngModel]="param.value"
                  (ngModelChange)="onValueChange(param.phaseParamId, $event, 'int')"
                />
              </mat-form-field>
            } @else {
              <mat-form-field appearance="fill" class="param-field">
                <input
                  matInput
                  type="text"
                  [ngModel]="param.value"
                  (ngModelChange)="onValueChange(param.phaseParamId, $event)"
                />
              </mat-form-field>
            }
          </td>
          <td>
            <div class="field-error" [class.has-error]="!!getError(param.phaseParamId)">
              {{ getError(param.phaseParamId) }}
            </div>
          </td>
        </tr>
      }
    } @else {
      <tr>
        <td colspan="3" class="no-data">No parameters need specifying</td>
      </tr>
    }
  </tbody>
</table>

<admin-carrier
  [visible]="showCarrierModal()"
  [saving]="savingCarrier()"
  [model]="carrierFormData()"
  (save)="submitCarrierModal($event)"
  (cancel)="closeCarrierModal()"
/>
  `,
  styleUrls: ['./admin-phase-param.component.css']
})
export class AdminPhaseParamComponent {
  private configService = inject(ConfigService);

  phaseParams = input<PhaseParam[]>([]);
  selectedParams = input<PhaseParamSelected[] | null>(null);
  validationErrors = input<PhaseParamValidationError[]>([]);
  paramsSelected = output<PhaseParamSelected[]>();

  filteredParams = signal<PhaseParamData[]>([]);

  showCarrierModal = signal(false);
  savingCarrier = signal(false);
  carrierFormData = signal<CarrierFormModel | null>(null);

  selectedParamForAdd = signal<PhaseParamData | null>(null);

  readonly editingCheckParams = signal<Record<number, boolean>>({});

  errorMap = computed(() => {
    const map = new Map<number, string>();
    for (const err of this.validationErrors()) {
      map.set(err.phaseParamId, err.message);
    }
    return map;
  });

  constructor() {
    effect(() => {
      const params = this.phaseParams();
      const selected = this.selectedParams();

      if (params?.length) {
        void this.initialize(params, selected);
      } else {
        this.filteredParams.set([]);
      }
    });
  }

  private async initialize(params: PhaseParam[], selectedParams: PhaseParamSelected[] | null) {
    const filtered = params.filter(p => this.isWrappedEvaluation(p));
    const selectedMap = new Map(
      (selectedParams ?? []).map(p => [p.phaseParamId, p.value])
    );

    const result: PhaseParamData[] = [];

    for (const p of filtered) {
      let options: ConfigItem[] = [];
      let type = p.type ?? null;

      let def = '';
      if (p.paramConfig) {
        if (p.paramConfig.startsWith('CHECK(')) {
          def = p.paramConfig.substring(6, p.paramConfig.length - 1);
          type = 'check';
        } else {
          
        }
      }

      const defaults: ConfigItem[] = [];
      if (p.input === 2 && !p.optional) {
        def = p.evaluation ?? '(Input At Job Start)';
        defaults.push({
          key: def,
          value: def
        });
      }

      const value = selectedMap.get(p.phaseParamId) ?? '';

      let finalOptions = [...options];
      if (
        value &&
        !finalOptions.some(o => o.key === value) &&
        !defaults.some(d => d.key === value)
      ) {
        finalOptions.unshift({ key: value, value });
      }

      result.push({
        phaseId: p.phaseId,
        phaseParamId: p.phaseParamId,
        phaseNumber: p.phaseNumber,
        key: p.paramName,
        value,
        paramConfig: p.paramConfig,
        type,
        options: [...defaults, ...finalOptions],
        input: p.input,
        searchable: p.searchable ?? false,
        editable: p.editable ?? false,
        optional: p.optional ?? false,
        status: type === 'check' ? ParamStatus.INITIALISED : ParamStatus.MATCHING
      });
    }

    this.filteredParams.set(result);
    this.editingCheckParams.set({});
  }

  private isWrappedEvaluation(evaluation: PhaseParam): boolean {
    return !!evaluation.evaluation &&
      evaluation.evaluation.trim().startsWith('(') &&
      evaluation.evaluation.trim().endsWith(')');
  }

  onValueChange(id: number, value: string | boolean, type?: string) {
    this.filteredParams.update(params =>
      params.map(p => {
        if (p.phaseParamId !== id) return p;

        let nextValue: string;

        if (type === 'int') {
          const parsed = Number(value);
          nextValue = Number.isInteger(parsed) ? parsed.toString() : '';
        } else if (type === 'boolean') {
          nextValue = value ? 'true' : 'false';
        } else {
          nextValue = String(value ?? '');
        }

        return {
          ...p,
          value: nextValue,
          status: ParamStatus.INITIALISED
        };
      })
    );

    this.emitChanges();
  }

  onDateChange(id: number, date: Moment | null) {
    this.filteredParams.update(params =>
      params.map(p =>
        p.phaseParamId === id
          ? {
              ...p,
              value: date ? date.format(UK_DATE_FORMATS.storage) : ''
            }
          : p
      )
    );

    this.emitChanges();
  }

  parseDate(value: string): Moment | null {
    if (!value) return null;
    return moment(value, UK_DATE_FORMATS.storage, true);
  }

  addItem(param: PhaseParamData) {
    const configName = param.paramConfig?.toLowerCase();

    if (configName === 'carrier') {
      this.selectedParamForAdd.set(param);
      this.carrierFormData.set({
        code: '',
        name: '',
        contactName: '',
        contactNumber: ''
      });
      this.showCarrierModal.set(true);
      return;
    }

    console.error(`Add item modal not implemented for paramConfig: ${param.paramConfig}`);
  }

  closeCarrierModal() {
    this.showCarrierModal.set(false);
    this.selectedParamForAdd.set(null);
    this.carrierFormData.set(null);
  }

  async submitCarrierModal(form: CarrierFormModel) {
    const param = this.selectedParamForAdd();
    if (!param) return;

    try {
      this.savingCarrier.set(true);

      const newItem = await this.configService.addItem(param.paramConfig, {
        code: form.code,
        name: form.name,
        contactName: form.contactName,
        contactNumber: form.contactNumber
      });

      this.filteredParams.update(params =>
        params.map(p =>
          p.phaseParamId === param.phaseParamId
            ? {
                ...p,
                options: [...p.options, newItem],
                value: newItem.key
              }
            : p
        )
      );

      this.emitChanges();
      this.closeCarrierModal();
    } catch (err) {
      console.error('Failed to add new carrier item', err);
      alert('Failed to add new item');
    } finally {
      this.savingCarrier.set(false);
    }
  }

  onNgSelectChange(id: number, key: string) {
    this.filteredParams.update(params =>
      params.map(p =>
        p.phaseParamId === id
          ? {
              ...p,
              value: key ?? ''
            }
          : p
      )
    );

    this.emitChanges();
  }

  private emitChanges() {
    const selected: PhaseParamSelected[] = this.filteredParams().map(p => ({
      phaseId: p.phaseId,
      phaseParamId: p.phaseParamId,
      phaseNumber: p.phaseNumber,
      key: p.key,
      value: p.value,
      input: p.input
    }));

    this.paramsSelected.emit(selected);
  }

  getError(paramId: number): string {
    return this.errorMap().get(paramId) ?? '';
  }

  clearDate(id: number) {
    this.onDateChange(id, null);
  }
}