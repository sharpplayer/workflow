import {
  AfterViewInit,
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ElementRef,
  EnvironmentInjector,
  QueryList,
  ViewChildren,
  createComponent,
  inject,
  input,
  output,
  OnChanges,
  SimpleChanges,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { LoginComponent, LoginResult } from '../../login/login/login.component';
import { LoginResetComponent } from '../../login/reset/reset.component';
import { AuthService, ResetResult } from '../../../core/services/auth.service';
import { JobPartParam, JobPartPhase, JobService, JobStatusLabel, JobWithOnePart } from '../../../core/services/job.service';
import { Product } from '../../../core/services/product.service';
import { JobPhaseParamComponent } from '../job-phase-param/job-phase-param.component';
import { DeviceService } from '../../../core/services/device.service';

@Component({
  selector: 'job',
  standalone: true,
  imports: [DatePipe, JobPhaseParamComponent, CommonModule],
  template: `
    <div class="job-page">
      @if (job(); as currentJob) {
        <div class="job-top-panel">
          <div class="job-top-actions">
            <button type="button" (click)="logout()">Log Out</button>
            <button type="button" (click)="onSchedule()">Schedule</button>
          </div>

          <div class="job-summary-grid">
            <div class="job-ref-block">
              <div class="field">
                <div class="caption">Job Ref</div>
                <div class="job-ref-value">
                  {{ jobRefLine1 }}
                  @if (jobRefLine2) {
                    <br />
                    {{ jobRefLine2 }}
                  }
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
          </div>

          <div class="special-instructions-panel">
            <table class="special-instructions-table">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Special Instruction</th>
                </tr>
              </thead>
              <tbody>
                @if (getSpecialInstructionPhases(currentJob).length > 0) {
                  @for (phase of getSpecialInstructionPhases(currentJob); track phase.phaseId) {
                    <tr>
                      <td>{{ phase.phaseNumber }}</td>
                      <td>{{ phase.specialInstructions }}</td>
                    </tr>
                  }
                } @else {
                  <tr>
                    <td colspan="2" class="no-special-instructions">No special instructions.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="job-content">
          <div class="phase-table-scroll">
            @for (phase of getPhases(currentJob); track phase.phaseId) {
              <div
                #phaseBlock
                class="phase-block"
                [class.phase-active]="isPhaseStarted(phase)"
                [class.phase-inactive]="!isPhaseStarted(phase)">
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
                    <tr class="phase-title-row">
                      <th [attr.colspan]="getTotalDisplayColumns(currentJob, phase)">
                        {{ getPhaseTitle(phase) }}
                        @if (phase.specialInstructions?.trim()) {
                          <span class="phase-has-instructions"> • Special instructions</span>
                        }
                      </th>
                    </tr>

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
                          [disabled]="!isPhaseStarted(phase)"
                          [excludedUsernames]="getExcludedSignoffUsers(currentJob, phase, param)"
                          (valueChanged)="onParamValueChanged($event)"
                          (signoffRequested)="onSignoffRequested($event)">
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
                              [disabled]="!isPhaseStarted(phase)"
                              [excludedUsernames]="getExcludedSignoffUsers(currentJob, phase, param)"
                              (valueChanged)="onParamValueChanged($event)"
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
  `,
  styleUrl: './job.component.css'
})
export class JobComponent implements OnChanges, AfterViewInit {
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  readonly jobService = inject(JobService);
  readonly paramValues = signal<Record<number, string>>({});
  readonly deviceService = inject(DeviceService);

  @ViewChildren('phaseBlock')
  phaseBlocks!: QueryList<ElementRef<HTMLElement>>;

  readonly job = input<JobWithOnePart | null>(null);
  readonly schedule = output<void>();

  jobRefLine1 = '-';
  jobRefLine2 = '-';

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
    config: ''
  };

  readonly allStartedPhaseParamsFilled = computed(() => {
    const currentJob = this.job();
    if (!currentJob) {
      return false;
    }

    const values = this.paramValues();
    const startedPhaseIds = (currentJob.part.phases ?? [])
      .filter(phase => this.isPhaseStarted(phase))
      .map(phase => phase.phaseId);

    const params = (currentJob.part.params ?? []).filter(
      param =>
        startedPhaseIds.includes(param.partPhaseId) &&
        !param.config?.startsWith('SIGN(')
    );

    return params.every(param => {
      const value = values[param.partParamId];
      return value != null && String(value).trim() !== '';
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
      this.jobRefLine1 = '-';
      this.jobRefLine2 = '-';
      return;
    }

    try {
      const result = await this.jobService.getJobRef(currentJob.number);

      if (typeof result === 'string') {
        const lines = result.split(/\r?\n/).filter(Boolean);
        this.jobRefLine1 = lines[0] ?? result;
        this.jobRefLine2 = lines[1] ?? '';
      } else {
        this.jobRefLine1 = String(result ?? '-');
        this.jobRefLine2 = '';
      }
    } catch {
      this.jobRefLine1 = '-';
      this.jobRefLine2 = '';
    }

    this.cdr.detectChanges();
  }

  private scrollToActivePhase(): void {
    const currentJob = this.job();
    if (!currentJob || !this.phaseBlocks?.length) {
      return;
    }

    const activeIndex = this.getPhases(currentJob).findIndex(phase => this.isPhaseStarted(phase));

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

  openPinLogin(params: {
    partParamId: number;
    partPhaseId: number;
    username?: string;
    role?: string;
    paramValueMap: Record<number, string>;
  }): void {
    const container = document.createElement('div');
    container.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 9999 !important;
    background: rgba(0,0,0,0.55) !important;
    margin: 0 !important;
    padding: 0 !important;
  `;
    document.body.appendChild(container);

    let currentRef: ComponentRef<LoginComponent | LoginResetComponent> | null = null;

    const destroyCurrent = (): void => {
      if (currentRef) {
        this.appRef.detachView(currentRef.hostView);
        currentRef.destroy();
        currentRef = null;
      }
    };

    const cleanup = (): void => {
      destroyCurrent();
      container.remove();
    };

    const mount = (ref: ComponentRef<LoginComponent | LoginResetComponent>): void => {
      this.appRef.attachView(ref.hostView);
      const domElem = ref.location.nativeElement as HTMLElement;
      container.appendChild(domElem);
      currentRef = ref;
    };

    const showLogin = (): void => {
      destroyCurrent();

      const ref = createComponent(LoginComponent, {
        environmentInjector: this.environmentInjector
      });

      const username = params.username ?? '';
      const role = params.role ?? '';
      const mode: 'pin' | 'password' =  this.deviceService.isUserLoggedIn(username) ? 'pin' : 'password';

      ref.setInput('username', username);
      ref.setInput('role', role);
      ref.setInput('mode', mode);
      ref.setInput('showCancel', true);

      ref.instance.loginSubmit.subscribe(async (loginResult: LoginResult) => {
        const currentJob = this.job();
        if (!currentJob) {
          cleanup();
          return;
        }

        const phase = this.getPhases(currentJob).find(p => p.phaseId === params.partPhaseId);
        if (!phase) {
          cleanup();
          return;
        }

        const usernameValue = loginResult.username ?? params.username ?? '';
        const trimmedUsername = usernameValue.trim();

        if (!trimmedUsername) {
          alert('Unable to determine operator username for signoff.');
          return;
        }

        if (this.isUsernameAlreadyUsedInPhase(currentJob, phase, trimmedUsername, params.partParamId)) {
          alert(`${trimmedUsername} has already signed another signoff in this phase.`);
          return;
        }

        const fullParamMap: Record<number, string> = {
          ...params.paramValueMap,
          [params.partParamId]: trimmedUsername
        };

        try {
          const success = await this.jobService.signOff(
            loginResult,
            fullParamMap
          );

          if (success) {
            this.paramValues.update(values => ({
              ...values,
              [params.partParamId]: trimmedUsername
            }));

            this.cdr.detectChanges();
          }

          if (loginResult.passwordReset) {
            showReset(loginResult.username);
          } else if (loginResult.pinReset) {
            showPinReset(loginResult.username);
          } else {
            cleanup();
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'An unexpected error occurred';
          ref.setInput('authError', message);
        }
      });

      ref.instance.cancelled.subscribe(() => cleanup());

      mount(ref);
    };

    const showReset = (userNameValue: string): void => {
      destroyCurrent();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.setInput('username', userNameValue);

      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.authService.resetPassword(resetResult);
        cleanup();
      });

      mount(ref);
    };

    const showPinReset = (userNameValue: string): void => {
      destroyCurrent();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.setInput('username', userNameValue);
      ref.setInput('mode', 'pin');

      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.authService.resetPassword(resetResult);
        cleanup();
      });

      mount(ref);
    };

    showLogin();
  }

  async onSignoffRequested(event: { param: JobPartParam; username?: string; role?: string }): Promise<void> {
    const currentJob = this.job();
    if (!currentJob) {
      return;
    }

    const phase = this.getPhases(currentJob).find(p => p.phaseId === event.param.partPhaseId);
    if (!phase) {
      return;
    }

    if (!this.arePhaseParamsFilled(currentJob, phase)) {
      alert('Please fill in all phase parameters before signoff.');
      return;
    }

    const paramValueMap = this.buildParamValueMap(currentJob);

    this.openPinLogin({
      partParamId: event.param.partParamId,
      partPhaseId: event.param.partPhaseId,
      username: event.username,
      role: event.role,
      paramValueMap
    });
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

  onParamValueChanged(event: { param: JobPartParam; value: string }): void {
    this.paramValues.update(values => ({
      ...values,
      [event.param.partParamId]: event.value
    }));
  }

  isPhaseStarted(phase: JobPartPhase): boolean {
    return phase.status === 10;
  }

  private initialiseParamValues(): void {
    const currentJob = this.job();

    if (!currentJob) {
      this.paramValues.set({});
      return;
    }

    const values: Record<number, string> = {};

    for (const param of currentJob.part.params ?? []) {
      values[param.partParamId] = param.value ?? '';
    }

    this.paramValues.set(values);
  }

  arePhaseParamsFilled(job: JobWithOnePart, phase: JobPartPhase): boolean {
    const values = this.paramValues();

    return this.getEditableParamsForPhase(job, phase).every(param => {
      const value = values[param.partParamId];
      return value != null && String(value).trim() !== '';
    });
  }

  private isEditableParam(param: JobPartParam, phase: JobPartPhase): boolean {
    return (
      this.isPhaseStarted(phase) &&
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
}