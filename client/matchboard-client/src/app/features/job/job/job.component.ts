import {
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  EnvironmentInjector,
  createComponent,
  inject,
  input,
  output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { LoginComponent, LoginResult } from '../../login/login/login.component';
import { LoginResetComponent } from '../../login/reset/reset.component';
import { AuthService, ResetResult } from '../../../core/services/auth.service';
import { JobPartParam, JobPartPhase, JobService, JobWithOnePart } from '../../../core/services/job.service';
import { Product } from '../../../core/services/product.service';

@Component({
  selector: 'job',
  standalone: true,
  imports: [DatePipe],
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
                  <div class="value">{{ currentJob.customer ?? '-' }}</div>
                </div>

                <div class="field">
                  <div class="caption">Carrier</div>
                  <div class="value">{{ currentJob.carrier ?? '-' }}</div>
                </div>

                <div class="field">
                  <div class="caption">Zone</div>
                  <div class="value">{{ zone || '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="product-details">
            <div class="details-top-row">
              <div class="field">
                <div class="caption">Format</div>
                <div class="value">
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
              <div class="phase-block">
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
                          {{ param.value }}
                        </td>
                      }

                      @if (getSignParamsForPhase(currentJob, phase).length > 0) {
                        @for (param of getSignParamsForPhase(currentJob, phase); track param.partParamId; let i = $index) {
                          <td
                            class="signoff-column signoff-active"
                            [attr.colspan]="getSignColSpan(currentJob, phase, i)">
                            {{ param.value }}
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
            <div class="job-actions">
              @if (!jobCompleted) {
                <button
                  type="button"
                  (click)="openPinLogin('op', currentJob.part.jobPartId)">
                  Complete Job
                </button>
              } @else {
                <p>Job completed.</p>
              }
            </div>
          </div>
        </div>
      } @else {
        <p>No job loaded.</p>
      }
    </div>
  `,
  styleUrl: './job.component.css'
})
export class JobComponent implements OnChanges {
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  readonly jobService = inject(JobService);

  readonly job = input<JobWithOnePart | null>(null);
  readonly schedule = output<void>();

  jobCompleted = false;

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

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['job'] && this.job()) {
      await this.loadJobRef();
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

  openPinLogin(username: string, jobId: number): void {
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

      ref.setInput('username', username);
      ref.setInput('mode', 'pin');

      ref.instance.loginSubmit.subscribe(async (loginResult: LoginResult) => {
        const success = await this.authService.completeJob(String(jobId), loginResult);

        if (success) {
          this.jobCompleted = true;
          this.cdr.detectChanges();
        }

        if (loginResult.passwordReset) {
          showReset(username);
        } else if (loginResult.pinReset) {
          showPinReset(username);
        } else {
          cleanup();
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

  logout(): void {
    this.router.navigate(['/login']);
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
    return `Phase ${phase.phaseNumber} - ${phase.description}`;
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
}