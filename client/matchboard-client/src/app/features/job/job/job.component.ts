import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  inject,
  input,
  output,
  OnChanges,
  SimpleChanges,
  signal,
  computed
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import {
  JobPartParam,
  JobPartPhase,
  JobService,
  JobStatusLabel,
  JobWithOnePart,
  ParamStatus
} from '../../../core/services/job.service';
import { Product } from '../../../core/services/product.service';
import { JobPhaseParamComponent } from '../job-phase-param/job-phase-param.component';
import { DeviceService } from '../../../core/services/device.service';
import { WastageComponent } from "../wastage/wastage.component";

@Component({
  selector: 'job',
  standalone: true,
  imports: [DatePipe, JobPhaseParamComponent, CommonModule, WastageComponent],
  template: `
    <div class="job-page">
      @if (job(); as currentJob) {
        <div class="job-top-panel">
          <div class="job-summary-grid">
            <div class="job-ref-block">
              <div class="field">
                <div class="caption">Job Ref</div>
                <div class="job-ref-value">
                  {{ jobRef }}
                </div>
              </div>
            </div>

            <div class="summary-main">
              <div class="summary-row">
                <div class="field">
                  <div class="caption">Due Date</div>
                  <div class="value">{{ currentJob.due | date:'dd/MM/yyyy' }}</div>
                </div>

                <div class="field">
                  <div class="caption">Part Number</div>
                  <div class="value">{{ getPartDisplay(currentJob) }}</div>
                </div>

                <div class="field">
                  <div class="caption">Job Number</div>
                  <div class="value">{{ currentJob.number }}</div>
                </div>
              </div>

              <div class="summary-row">
                <div class="field">
                  <div class="caption">Customer Code</div>
                  <div class="value">{{ currentJob.customer?.code ?? '-' }}</div>
                </div>

                <div class="field">
                  <div class="caption">Zone</div>
                  <div class="value">{{ currentJob.customer?.zone ?? '-' }}</div>
                </div>

                <div class="field">
                  <div class="caption">Carrier</div>
                  <div class="value">{{ currentJob.carrier?.code ?? '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="product-details">
            <div class="details-top-row">
              <div class="field">
                <div class="caption">Format</div>
                <div
                  class="value"
                  [ngClass]="{
                    'landscape': currentJob.product.width > currentJob.product.length,
                    'portrait': currentJob.product.width <= currentJob.product.length
                  }"
                >
                  {{ currentJob.product.width > currentJob.product.length ? 'LANDSCAPE' : 'PORTRAIT' }}
                </div>
              </div>

              <div class="field">
                <div class="caption">Dimensions</div>
                <div class="value">
                  {{ currentJob.product.width }} x {{ currentJob.product.length }} x {{ currentJob.product.thickness }}
                </div>
              </div>
            </div>

            <div class="details-grid">
              <div class="field">
                <div class="caption">Product Code</div>
                <div class="value">{{ getProductCode(currentJob.product) }}</div>
              </div>

              <div class="field">
                <div class="caption">Profile</div>
                <div class="value">{{ currentJob.product.profile || '-' }}</div>
              </div>

              <div class="field">
                <div class="caption">Pitch</div>
                <div class="value">{{ currentJob.product.pitch || '-' }}</div>
              </div>

              <div class="field">
                <div class="caption">Edge</div>
                <div class="value">{{ currentJob.product.edge || '-' }}</div>
              </div>

              <div class="field">
                <div class="caption">Paint</div>
                <div class="value">{{ currentJob.product.finish }}</div>
              </div>

              <div class="field">
                <div class="caption">From Call Off</div>
                <div class="value">{{ currentJob.part.fromCallOff ? 'YES' : 'NO' }}</div>
              </div>
            </div>

            <div class="details-full-row">
              <div class="field">
                <div class="caption">Quantity</div>
                <div class="value">{{ currentJob.part.quantity }}</div>
              </div>

              <div class="field">
                <div class="caption">Workstations</div>
                <div class="value">{{ currentJob.product.machinery.map(i => i.name).join(' → ') }}</div>
              </div>
            </div>
          </div>

          <div class="job-top-actions">
            <button type="button" (click)="logout()">Log Out</button>
            <button type="button" (click)="onSchedule()">Schedule</button>
            <button type="button" (click)="onNextJob()">Next Job</button>
          </div>
        </div>


        <div class="job-content">
          <div class="phase-table-scroll">
            @for (phase of getPhases(currentJob); track phase.phaseId) {
              <div
                #phaseBlock
                class="phase-block"
                [class.phase-active]="isPhaseActive(phase)"
                [class.phase-inactive]="!isPhaseActive(phase)">
                <table class="phase-table">
                  <colgroup>
                    @for (param of getDisplayNonSignParams(currentJob, phase); track $index) {
                      <col class="param-col" />
                    }

                    @for (slot of getSignSlots(currentJob); track slot) {
                      <col class="signoff-col" />
                    }
                  </colgroup>

                  <thead>
                    <tr class="phase-title-row" 
                        [class.phase-active]="isPhaseActive(phase)"
                        [class.phase-inactive]="!isPhaseActive(phase)">
                      <th [attr.colspan]="getTotalDisplayColumns(currentJob, phase)">
                        {{ getPhaseTitle(phase) }}
                      </th>
                    </tr>
                      @if (phase.specialInstructions?.trim()) {
                        <tr  class="special-instruction-row"
                                        [class.phase-active]="isPhaseActive(phase)"
                                        [class.phase-inactive]="!isPhaseActive(phase)">
                      <th [attr.colspan]="getTotalDisplayColumns(currentJob, phase)">
                          <span>Special instructions: {{ phase.specialInstructions }}</span>
                      </th>
                      </tr>
                      }

                    <tr class="phase-param-header-row">
                      @for (param of getDisplayNonSignParams(currentJob, phase); track $index) {
                        <th class="param-column">
                          {{ isPlaceholderParam(param) ? '' : param.name }}
                        </th>
                      }

                      @if (getSignParamsForPhase(currentJob, phase).length > 0) {
                        @for (param of getSignParamsForPhase(currentJob, phase); track param.partParamId; let i = $index) {
                          <th
                            class="signoff-column signoff-active"
                            [attr.colspan]="getSignColSpan(currentJob, phase, i)">
                            {{ param.name }}
                          </th>
                        }
                      } @else {
                        <th
                          class="signoff-column signoff-empty"
                          [attr.colspan]="getMaxSignParams(currentJob)">
                        </th>
                      }
                    </tr>
                  </thead>

                  <tbody>
                    <tr class="phase-param-value-row">
                      @for (param of getDisplayNonSignParams(currentJob, phase); track $index) {
                        <td class="param-column value">
                          <job-phase-param
                            [param]="param"
                            [currentValue]="getParamDisplayValue(param)"
                            [disabled]="!isPhaseActive(phase)"
                            [excludedUsernames]="getExcludedSignoffUsers(currentJob, phase, param)"
                            (valueChanged)="onParamValueChanged($event)"
                            (checkStatusChanged)="onCheckStatusChanged($event)"
                            (signoffRequested)="onSignoffRequested($event)"
                            (wastageRequested)="openWastageDialog($event)">
                            >
                          </job-phase-param>
                        </td>
                      }

                      @if (getSignParamsForPhase(currentJob, phase).length > 0) {
                        @for (param of getSignParamsForPhase(currentJob, phase); track param.partParamId; let i = $index) {
                          <td
                            class="signoff-column signoff-active"
                            [attr.colspan]="getSignColSpan(currentJob, phase, i)">
                            <job-phase-param
                              [param]="param"
                              [currentValue]="getParamDisplayValue(param)"
                              [disabled]="!isPhaseActive(phase)"
                              [excludedUsernames]="getExcludedSignoffUsers(currentJob, phase, param)"
                              (valueChanged)="onParamValueChanged($event)"
                              (checkStatusChanged)="onCheckStatusChanged($event)"
                              (signoffRequested)="onSignoffRequested($event)">
                            </job-phase-param>
                          </td>
                        }
                      } @else {
                        <td
                          class="signoff-column signoff-empty"
                          [attr.colspan]="getMaxSignParams(currentJob)">
                        </td>
                      }
                    </tr>
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      } @else {
        <p>No job loaded.</p>
      }
    </div>
    @if (showWastageDialog() && selectedWastageParam(); as param) {
      <wastage
        [jobPhaseId]="param.partPhaseId"
        [param]="param"
        (closed)="closeWastageDialog()"
        (saved)="onWastageSaved($event)">
      </wastage>
      }
  `,
  styleUrl: './job.component.css'
})
export class JobComponent implements OnChanges, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly jobService = inject(JobService);
  readonly deviceService = inject(DeviceService);

  readonly paramValues = signal<Record<number, string>>({});
  readonly paramStatuses = signal<Record<number, ParamStatus>>({});
  readonly selectedWastageParam = signal<JobPartParam | null>(null);
  readonly showWastageDialog = signal(false);
  readonly jobUpdated = output<JobWithOnePart>();
  readonly nextJob = output<void>();

  @ViewChildren('phaseBlock')
  phaseBlocks!: QueryList<ElementRef<HTMLElement>>;

  readonly job = input<JobWithOnePart | null>(null);
  readonly schedule = output<void>();

  jobRef = '-';

  zone = '';

  private readonly placeholderParam: JobPartParam = {
    partParamId: -1,
    partPhaseId: -1,
    phaseId: -1,
    phaseNumber: -1,
    input: -1,
    name: '',
    value: null,
    valuedAt: null,
    config: '',
    status: ParamStatus.INITIALISED,
    machineId: null,
    pack: null
  };

  readonly allStartedPhaseParamsFilled = computed(() => {
    const currentJob = this.job();
    if (!currentJob) {
      return false;
    }

    const values = this.paramValues();
    const statuses = this.paramStatuses();

    const startedPhaseIds = (currentJob.part.phases ?? [])
      .filter(phase => this.isPhaseActive(phase))
      .map(phase => phase.phaseId);

    const params = (currentJob.part.params ?? []).filter(
      param =>
        startedPhaseIds.includes(param.partPhaseId) &&
        !param.config?.startsWith('SIGN(')
    );

    return params.every(param => {
      const value = values[param.partParamId];
      const hasValue = value != null && String(value).trim() !== '';

      if (!hasValue) {
        return false;
      }

      if (param.config?.startsWith('CHECK(')) {
        const status = statuses[param.partParamId] ?? param.status ?? ParamStatus.INITIALISED;
        return status !== ParamStatus.INITIALISED;
      }

      return true;
    });
  });

  ngAfterViewInit(): void {
    this.scrollToActivePhase();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['job'] && this.job()) {
      this.initialiseParamValues();
      await this.loadJobRef();

      setTimeout(() => {
        this.scrollToActivePhase();
      }, 0);
    }
  }

  onSchedule(): void {
    this.schedule.emit();
  }

  private async loadJobRef(): Promise<void> {
    const currentJob = this.job();
    if (!currentJob) {
      this.jobRef = '-';
      return;
    }

    this.jobRef = this.jobService.getJobRef(currentJob.number);
    this.cdr.detectChanges();
  }

  private scrollToActivePhase(): void {
    const currentJob = this.job();
    if (!currentJob || !this.phaseBlocks?.length) {
      return;
    }

    const activeIndex = this.getPhases(currentJob).findIndex(phase => this.isPhaseActive(phase));

    if (activeIndex < 0) {
      return;
    }

    const block = this.phaseBlocks.toArray()[activeIndex]?.nativeElement;
    if (!block) {
      return;
    }

    const container = block.closest('.phase-table-scroll');
    if (!(container instanceof HTMLElement)) {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const stickyOffset = 80;
    const top = block.offsetTop - stickyOffset;

    container.scrollTo({
      top: Math.max(top, 0),
      behavior: 'smooth'
    });
  }

  getPartDisplay(job: JobWithOnePart): string {
    return `${job.partNumber} of ${job.parts}`;
  }

  getProductCode(product: Product): string {
    const name = `${product.name}${product.oldName ? ' (' + product.oldName + ')' : ''}`;
    return name.replace(/-/g, '\u2011');
  }

  getSpecialInstructionPhases(job: JobWithOnePart): JobPartPhase[] {
    return (job.part.phases ?? []).filter(
      phase => !!phase.specialInstructions?.trim()
    );
  }

  getParamDisplayValue(param: JobPartParam): string {
    return this.paramValues()[param.partParamId] ?? param.value ?? '';
  }

  async onSignoffRequested(event: { param: JobPartParam; username?: string; role?: string }): Promise<void> {
    const currentJob = this.job();
    if (!currentJob) {
      return;
    }

    const phase = this.getPhases(currentJob).find(
      p => p.phaseId === event.param.partPhaseId
    );

    if (!phase) {
      return;
    }

    if (!this.arePhaseParamsFilled(currentJob, phase)) {
      alert('Please fill in all phase parameters before signoff.');
      return;
    }

    const paramValueMap = this.buildParamValueMap(currentJob);
    const loginResult = await this.authService.open({
      username: event.username,
      role: event.role
    });

    if (!loginResult) {
      return;
    }

    const usernameValue = loginResult.username ?? event.username ?? '';
    const trimmedUsername = usernameValue.trim();

    if (!trimmedUsername) {
      alert('Unable to determine operator username for signoff.');
      return;
    }

    if (
      this.isUsernameAlreadyUsedInPhase(
        currentJob,
        phase,
        trimmedUsername,
        event.param.partParamId
      )
    ) {
      alert(`${trimmedUsername} has already signed another signoff in this phase.`);
      return;
    }

    const fullParamMap: Record<number, string> = {
      ...paramValueMap,
      [event.param.partParamId]: trimmedUsername
    };

    try {
      const updatedJob = await this.jobService.signOff(loginResult, fullParamMap);

      if (updatedJob) {
        this.paramValues.update(values => ({
          ...values,
          [event.param.partParamId]: trimmedUsername
        }));

        this.jobUpdated.emit(updatedJob);
        this.cdr.detectChanges();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      alert(message);
    }
  }

  onParamValueChanged(event: { param: JobPartParam; value: string }): void {
    this.paramValues.update(values => ({
      ...values,
      [event.param.partParamId]: event.value
    }));
  }

  onCheckStatusChanged(event: { param: JobPartParam; status: ParamStatus; value: string }): void {
    this.paramValues.update(values => ({
      ...values,
      [event.param.partParamId]: event.value
    }));

    this.paramStatuses.update(statuses => ({
      ...statuses,
      [event.param.partParamId]: event.status
    }));
  }

  private buildParamValueMap(job: JobWithOnePart): Record<number, string> {
    const currentValues = this.paramValues();
    const result: Record<number, string> = {};

    for (const phase of job.part.phases ?? []) {
      for (const param of this.getEditableParamsForPhase(job, phase)) {
        result[param.partParamId] = String(
          currentValues[param.partParamId] ?? param.value ?? ''
        );
      }
    }

    return result;
  }

  async logout() {
    await this.authService.logoutAll();
  }

  getPhases(job: JobWithOnePart): JobPartPhase[] {
    return job.part.phases ?? [];
  }

  getParamsForPhase(job: JobWithOnePart, phase: JobPartPhase): JobPartParam[] {
    return (job.part.params ?? []).filter(
      param => param.partPhaseId === phase.phaseId
    );
  }

  getPhaseTitle(phase: JobPartPhase): string {
    const s = JobStatusLabel[phase.status];
    return `Phase ${phase.phaseNumber} - ${phase.description} ${s}`;
  }

  getNonSignParamsForPhase(job: JobWithOnePart, phase: JobPartPhase): JobPartParam[] {
    return this.getParamsForPhase(job, phase)
      .filter(param => !param.config?.startsWith('SIGN('));
  }

  getSignParamsForPhase(job: JobWithOnePart, phase: JobPartPhase): JobPartParam[] {
    return this.getParamsForPhase(job, phase)
      .filter(param => !!param.config?.startsWith('SIGN('));
  }

  getDisplayNonSignParams(job: JobWithOnePart, phase: JobPartPhase): JobPartParam[] {
    const params = this.getNonSignParamsForPhase(job, phase);
    console.log("PACKS" + phase.phaseId)
    console.log(params.map(i => i.pack))
    return params.length > 0 ? params : [this.placeholderParam];
  }

  getMaxSignParams(job: JobWithOnePart): number {
    return Math.max(
      ...job.part.phases.map(phase => this.getSignParamsForPhase(job, phase).length),
      1
    );
  }

  getSignSlots(job: JobWithOnePart): number[] {
    return Array.from({ length: this.getMaxSignParams(job) }, (_, i) => i);
  }

  getSignColSpan(job: JobWithOnePart, phase: JobPartPhase, index: number): number {
    const signParams = this.getSignParamsForPhase(job, phase);
    const max = this.getMaxSignParams(job);

    if (signParams.length === 0) {
      return max;
    }

    const base = Math.floor(max / signParams.length);
    const remainder = max % signParams.length;

    return base + (index < remainder ? 1 : 0);
  }

  getTotalDisplayColumns(job: JobWithOnePart, phase: JobPartPhase): number {
    return this.getDisplayNonSignParams(job, phase).length + this.getMaxSignParams(job);
  }

  isPlaceholderParam(param: JobPartParam): boolean {
    return param.partParamId === -1;
  }

  isPhaseActive(phase: JobPartPhase): boolean {
    return phase.status === 10 && this.job()?.activePhase === phase.phaseId;
  }

  private initialiseParamValues(): void {
    const currentJob = this.job();

    if (!currentJob) {
      this.paramValues.set({});
      this.paramStatuses.set({});
      return;
    }

    const values: Record<number, string> = {};
    const statuses: Record<number, ParamStatus> = {};

    for (const param of currentJob.part.params ?? []) {
      values[param.partParamId] = param.value ?? '';
      statuses[param.partParamId] = param.status ?? ParamStatus.INITIALISED;
    }

    this.paramValues.set(values);
    this.paramStatuses.set(statuses);
  }

  arePhaseParamsFilled(job: JobWithOnePart, phase: JobPartPhase): boolean {
    const values = this.paramValues();
    const statuses = this.paramStatuses();

    return this.getEditableParamsForPhase(job, phase).every(param => {
      const value = values[param.partParamId];
      const hasValue = value != null && String(value).trim() !== '';
      const status = statuses[param.partParamId] ?? param.status ?? ParamStatus.INITIALISED;

      if (!hasValue) {
        return false;
      }

      if (param.config?.startsWith('CHECK(')) {
        return status !== ParamStatus.INITIALISED;
      }

      return true;
    });
  }

  private isEditableParam(param: JobPartParam, phase: JobPartPhase): boolean {
    return (
      this.isPhaseActive(phase) &&
      !param.config?.startsWith('SIGN(') &&
      param.input === 3
    );
  }

  private getEditableParamsForPhase(
    job: JobWithOnePart,
    phase: JobPartPhase
  ): JobPartParam[] {
    return this.getParamsForPhase(job, phase).filter(param =>
      this.isEditableParam(param, phase)
    );
  }

  private getParamCurrentValue(param: JobPartParam): string {
    const value = this.paramValues()[param.partParamId] ?? param.value ?? '';
    return String(value).trim();
  }

  getExcludedSignoffUsers(
    job: JobWithOnePart,
    phase: JobPartPhase,
    currentParam: JobPartParam
  ): string[] {
    return this.getSignParamsForPhase(job, phase)
      .filter(param => param.partParamId !== currentParam.partParamId)
      .map(param => this.getParamCurrentValue(param))
      .filter(value => value !== '');
  }

  private isUsernameAlreadyUsedInPhase(
    job: JobWithOnePart,
    phase: JobPartPhase,
    username: string,
    currentParamId: number
  ): boolean {
    const normalized = username.trim().toLowerCase();

    return this.getSignParamsForPhase(job, phase)
      .filter(param => param.partParamId !== currentParamId)
      .some(param => this.getParamCurrentValue(param).toLowerCase() === normalized);
  }

  openWastageDialog(event: { param: JobPartParam }): void {
    this.selectedWastageParam.set(event.param);
    this.showWastageDialog.set(true);
  }

  closeWastageDialog(): void {
    this.showWastageDialog.set(false);
    this.selectedWastageParam.set(null);
  }

  onWastageSaved(event: unknown): void {
    this.closeWastageDialog();
  }

  onNextJob() {
    this.nextJob.emit();
  }
}