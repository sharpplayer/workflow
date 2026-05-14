import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
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
  JobStatus,
  JobStatusLabel,
  JobWithOnePart,
  ParamSignOff,
  ParamStatus
} from '../../../core/services/job.service';
import { Product } from '../../../core/services/product.service';
import { JobPhaseParamComponent } from '../job-phase-param/job-phase-param.component';
import { DeviceService } from '../../../core/services/device.service';
import { WastageComponent } from '../wastage/wastage.component';
import { ConfigService, MachineInput } from '../../../core/services/config.service';
import { PromptService } from '../../../core/services/prompt.service';

type ParamValueState = 'disabled' | 'required' | 'complete' | 'neutral';

type PhasePackGroup = {
  pack: string | number | null;
  label: string;
  params: JobPartParam[];
  machineId: number | null;
};

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
                  }">
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
                <div class="caption">From Stock</div>
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
                    @if (hasMachineColumn(phase)) {
                      <col class="machine-col" />
                    }

                    @if (hasPackColumn(currentJob, phase)) {
                      <col class="pack-col" />
                    }

                    @for (param of getDisplayNonSignParamsForPhase(currentJob, phase); track $index) {
                      <col class="param-col" />
                    }

                    @for (param of getDisplaySignParamsForPhase(currentJob, phase); track $index) {
                      <col class="signoff-col" />
                    }
                  </colgroup>

                  <thead>
                    <tr
                      class="phase-title-row"
                      [class.phase-active]="isPhaseActive(phase)"
                      [class.phase-inactive]="!isPhaseActive(phase)">
                      <th [attr.colspan]="getTotalDisplayColumnsWithPack(currentJob, phase)">
                        {{ getPhaseTitle(phase) }}
                      </th>
                    </tr>

                    @if (phase.specialInstructions?.trim()) {
                      <tr
                        class="special-instruction-row"
                        [class.phase-active]="isPhaseActive(phase)"
                        [class.phase-inactive]="!isPhaseActive(phase)">
                        <th [attr.colspan]="getTotalDisplayColumnsWithPack(currentJob, phase)">
                          <span>Special instructions: {{ phase.specialInstructions }}</span>
                        </th>
                      </tr>
                    }

                    <tr
                      class="phase-param-header-row"
                      [class.phase-active]="isPhaseActive(phase)"
                      [class.phase-inactive]="!isPhaseActive(phase)">
                      @if (hasMachineColumn(phase)) {
                        <th class="machine-column">Machine</th>
                      }

                      @if (hasPackColumn(currentJob, phase)) {
                        <th class="pack-column">Pack</th>
                      }

                      @for (param of getDisplayNonSignParamsForPhase(currentJob, phase); track $index) {
                        <th class="param-column">
                          {{ isPlaceholderParam(param) ? '' : param.name }}
                        </th>
                      }

                      @for (param of getDisplaySignParamsForPhase(currentJob, phase); track $index) {
                        <th class="signoff-column signoff-active">
                          {{ isPlaceholderParam(param) ? '' : param.name }}
                        </th>
                      }
                    </tr>
                  </thead>

                  <tbody>
                    @for (group of getPackGroupsForPhase(currentJob, phase); track getPhaseGroupTrackKey(group)) {
                      <tr class="phase-param-value-row">
                        @if (hasMachineColumn(phase)) {
                          <td class="machine-column value">{{ getMachineName(group.machineId) }}</td>
                        }

                        @if (hasPackColumn(currentJob, phase)) {
                          <td class="pack-column value">
                            {{ group.label || '-' }}
                          </td>
                        }

                        @for (param of getDisplayNonSignParamsForPackRow(currentJob, phase, group); track $index) {
                          <td
                            class="param-column value"
                            [class.param-disabled]="isParamDisabled(currentJob, phase, group, param)">
                            @if (!isPlaceholderParam(param)) {
                              <job-phase-param
                                [param]="param"
                                [jobNumber]="currentJob.number"
                                [jobPart]="currentJob.partNumber"
                                [currentValue]="getParamDisplayValue(param)"
                                [disabled]="isParamDisabled(currentJob, phase, group, param)"
                                [machineName]="getMachineName(group.machineId)"
                                [excludedUsernames]="getExcludedSignoffUsersForPack(group, param)"
                                [valueState]="getParamValueState(currentJob, phase, group, param)"
                                [photoUploading]="isPhotoUploading(param)"
                                (valueChanged)="onParamValueChanged($event)"
                                (checkStatusChanged)="onCheckStatusChanged($event)"
                                (signoffRequested)="onSignoffRequested($event)"
                                (wastageRequested)="openWastageDialog($event)"
                                (photoRequested)="openCameraDialog($event)">
                              </job-phase-param>
                            }
                          </td>
                        }

                        @for (param of getDisplaySignParamsForPackRow(currentJob, phase, group); track $index) {
                          <td
                            class="signoff-column signoff-active"
                            [class.param-disabled]="isParamDisabled(currentJob, phase, group, param)">
                            @if (!isPlaceholderParam(param)) {
                              <job-phase-param
                                [param]="param"
                                [jobNumber]="currentJob.number"
                                [jobPart]="currentJob.partNumber"
                                [currentValue]="getParamDisplayValue(param)"
                                [disabled]="isParamDisabled(currentJob, phase, group, param)"
                                [machineName]="getMachineName(group.machineId)"
                                [excludedUsernames]="getExcludedSignoffUsersForPack(group, param)"
                                [valueState]="getParamValueState(currentJob, phase, group, param)"
                                [photoUploading]="isPhotoUploading(param)"
                                (valueChanged)="onParamValueChanged($event)"
                                (checkStatusChanged)="onCheckStatusChanged($event)"
                                (signoffRequested)="onSignoffRequested($event)"
                                (photoRequested)="openCameraDialog($event)">
                              </job-phase-param>
                            }
                          </td>
                        }
                      </tr>
                    }
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

    <input
      #cameraFileInput
      type="file"
      accept="image/*"
      capture="environment"
      hidden
      (change)="onCameraFileSelected($event)"
    />

    @if (cameraOpen()) {
      <div class="camera-modal-backdrop">
        <div class="camera-modal">
          <video
            #cameraVideo
            autoplay
            playsinline
            class="camera-video">
          </video>

          <div class="camera-actions">
            <button
              type="button"
              [disabled]="photoUploading()"
              (click)="captureCameraPhoto()">
              {{ photoUploading() ? 'Uploading...' : 'Capture' }}
            </button>

            <button
              type="button"
              [disabled]="photoUploading()"
              (click)="closeCameraDialog()">
              Cancel
            </button>
          </div>

          @if (cameraError(); as error) {
            <div class="camera-error">{{ error }}</div>
          }
        </div>
      </div>
    }

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
  private readonly configService = inject(ConfigService);
  private readonly promptService = inject(PromptService);

  readonly paramValues = signal<Record<number, string>>({});
  readonly paramStatuses = signal<Record<number, ParamStatus>>({});
  readonly selectedWastageParam = signal<JobPartParam | null>(null);
  readonly showWastageDialog = signal(false);
  readonly machines = signal<MachineInput[]>([]);
  readonly selectedPhotoParam = signal<JobPartParam | null>(null);
  readonly cameraOpen = signal(false);
  readonly cameraError = signal<string | null>(null);
  readonly photoUploading = signal(false);

  readonly jobUpdated = output<JobWithOnePart>();

  @ViewChildren('phaseBlock')
  phaseBlocks!: QueryList<ElementRef<HTMLElement>>;

  @ViewChild('cameraVideo')
  private cameraVideoRef?: ElementRef<HTMLVideoElement>;

  @ViewChild('cameraFileInput')
  private cameraFileInputRef?: ElementRef<HTMLInputElement>;

  readonly job = input.required<JobWithOnePart>();
  readonly schedule = output<void>();

  jobRef = '-';
  zone = '';

  private cameraStream?: MediaStream;

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

      await Promise.all([
        this.loadJobRef(),
        this.loadMachines()
      ]);

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

  private async loadMachines(): Promise<void> {
    const machines = await this.configService.getMachineList();
    this.machines.set(machines);
  }

  getMachineName(machineId: number | null): string {
    if (machineId === null || machineId === undefined) {
      return '-';
    }

    return this.machines().find(machine => machine.id === machineId)?.name ?? String(machineId);
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

  getParamValueState(
    job: JobWithOnePart,
    phase: JobPartPhase,
    group: PhasePackGroup,
    param: JobPartParam
  ): ParamValueState {
    if (this.isPlaceholderParam(param)) {
      return 'neutral';
    }

    if (this.isParamDisabled(job, phase, group, param)) {
      return 'disabled';
    }

    if (this.isParamComplete(param)) {
      return 'complete';
    }

    return 'required';
  }

  isParamComplete(param: JobPartParam): boolean {
    if (this.isPlaceholderParam(param)) {
      return false;
    }

    const value = this.paramValues()[param.partParamId] ?? param.value ?? '';
    const hasValue = String(value).trim() !== '';

    if (!hasValue) {
      return false;
    }

    if (param.config?.startsWith('CHECK(')) {
      const status =
        this.paramStatuses()[param.partParamId] ??
        param.status ??
        ParamStatus.INITIALISED;

      return status !== ParamStatus.INITIALISED;
    }

    return true;
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

    let paramValueMap: Record<number, ParamSignOff>;

    if (event.param.config?.startsWith('AWAIT(')) {
      paramValueMap = {
        [event.param.partParamId]: {
          value: String(
            this.paramValues()[event.param.partParamId] ?? event.param.value ?? ''
          ),
          paramStatus: event.param.status
        }
      };
    } else {
      if (!this.arePhaseParamsFilled(currentJob, phase, event.param.pack, event.param.machineId)) {
        await this.promptService.alert(
          'Please fill in all row parameters before signoff.',
          'Missing parameters'
        );
        return;
      }

      paramValueMap = this.buildParamValueMap(currentJob);
    }

    await this.authService.open({
      username: event.username,
      role: event.role,
      submit: async loginResult => {
        const usernameValue = loginResult.username ?? event.username ?? '';
        const trimmedUsername = usernameValue.trim();

        if (!trimmedUsername) {
          throw new Error('Unable to determine operator username for signoff.');
        }

        const fullParamMap: Record<number, ParamSignOff> = {
          ...paramValueMap,
          [event.param.partParamId]: {
            value: trimmedUsername,
            paramStatus: ParamStatus.MATCHING
          }
        };

        const updatedJob = await this.jobService.signOff(loginResult, fullParamMap);

        if (updatedJob) {
          this.paramValues.update(values => ({
            ...values,
            [event.param.partParamId]: trimmedUsername
          }));

          this.paramStatuses.update(statuses => ({
            ...statuses,
            [event.param.partParamId]: ParamStatus.MATCHING
          }));

          this.jobUpdated.emit(updatedJob);
          this.cdr.detectChanges();
        }

      }
    });
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

  private buildParamValueMap(job: JobWithOnePart): Record<number, ParamSignOff> {
    const currentValues = this.paramValues();
    const currentStatuses = this.paramStatuses();
    const result: Record<number, ParamSignOff> = {};

    for (const phase of job.part.phases ?? []) {
      for (const param of this.getEditableParamsForPhase(job, phase)) {
        result[param.partParamId] = {
          value: String(currentValues[param.partParamId] ?? param.value ?? ''),
          paramStatus: currentStatuses[param.partParamId] ?? param.status
        };
      }
    }

    return result;
  }

  async logout(): Promise<void> {
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

  getPackGroupsForPhase(job: JobWithOnePart, phase: JobPartPhase): PhasePackGroup[] {
    const params = this.getParamsForPhase(job, phase);
    const groupMap = new Map<string, PhasePackGroup>();

    for (const param of params) {
      const machineId = param.machineId ?? null;
      const pack = param.pack ?? null;
      const key = this.getMachinePackGroupKey(machineId, pack);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          machineId,
          pack,
          label: this.formatPackLabel(pack),
          params: []
        });
      }

      groupMap.get(key)!.params.push(param);
    }

    return Array.from(groupMap.values());
  }

  private formatPackLabel(pack: string | number | null): string {
    if (pack === null || pack === undefined) {
      return '';
    }

    const num = Number(pack);

    if (isNaN(num)) {
      return String(pack);
    }

    if (num <= 999) {
      return `${num}`;
    }

    if (num > 10_000_000) {
      return `${num % 10_000_000} R`;
    }

    return `${num} L`;
  }

  getDisplayNonSignParamsForPhase(job: JobWithOnePart, phase: JobPartPhase): JobPartParam[] {
    const params = this.getNonSignParamsForPhase(job, phase);

    if (params.length === 0) {
      return [this.placeholderParam];
    }

    const keys = Array.from(new Set(params.map(param => this.getParamColumnKey(param))));

    return keys.map(key =>
      params.find(param => this.getParamColumnKey(param) === key) ?? this.placeholderParam
    );
  }

  getDisplaySignParamsForPhase(job: JobWithOnePart, phase: JobPartPhase): JobPartParam[] {
    const params = this.getSignParamsForPhase(job, phase);

    if (params.length === 0) {
      return [this.placeholderParam];
    }

    const keys = Array.from(new Set(params.map(param => this.getParamColumnKey(param))));

    return keys.map(key =>
      params.find(param => this.getParamColumnKey(param) === key) ?? this.placeholderParam
    );
  }

  getDisplayNonSignParamsForPackRow(
    job: JobWithOnePart,
    phase: JobPartPhase,
    group: PhasePackGroup
  ): JobPartParam[] {
    const columns = this.getDisplayNonSignParamsForPhase(job, phase);

    return columns.map(column => {
      if (this.isPlaceholderParam(column)) {
        return this.placeholderParam;
      }

      return group.params.find(param =>
        !param.config?.startsWith('SIGN(') &&
        this.getParamColumnKey(param) === this.getParamColumnKey(column)
      ) ?? this.placeholderParam;
    });
  }

  getDisplaySignParamsForPackRow(
    job: JobWithOnePart,
    phase: JobPartPhase,
    group: PhasePackGroup
  ): JobPartParam[] {
    const columns = this.getDisplaySignParamsForPhase(job, phase);

    return columns.map(column => {
      if (this.isPlaceholderParam(column)) {
        return this.placeholderParam;
      }

      return group.params.find(param =>
        param.config?.startsWith('SIGN(') &&
        this.getParamColumnKey(param) === this.getParamColumnKey(column)
      ) ?? this.placeholderParam;
    });
  }

  getTotalDisplayColumnsWithPack(job: JobWithOnePart, phase: JobPartPhase): number {
    return (this.hasMachineColumn(phase) ? 1 : 0) +
      (this.hasPackColumn(job, phase) ? 1 : 0) +
      this.getDisplayNonSignParamsForPhase(job, phase).length +
      this.getDisplaySignParamsForPhase(job, phase).length;
  }

  private getParamColumnKey(param: JobPartParam): string {
    const type =
      param.config?.startsWith('SIGN(') ? 'SIGN' :
        param.config?.startsWith('CHECK(') ? 'CHECK' :
          param.config?.startsWith('AWAIT(') ? 'AWAIT' :
            'VALUE';

    return `${param.name}|${type}`;
  }

  private getMachinePackGroupKey(
    machineId: number | null,
    pack: string | number | null
  ): string {
    return `${machineId ?? 'no-machine'}|${pack ?? 'no-pack'}`;
  }

  getPhaseGroupTrackKey(group: PhasePackGroup): string {
    return this.getMachinePackGroupKey(group.machineId, group.pack);
  }

  isPlaceholderParam(param: JobPartParam): boolean {
    return param.partParamId === -1;
  }

  isPhaseActive(phase: JobPartPhase): boolean {
    return (
      (phase.status === JobStatus.READY || phase.status === JobStatus.STARTED) &&
      this.job().activePhase === phase.phaseId
    );
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

  arePhaseParamsFilled(
    job: JobWithOnePart,
    phase: JobPartPhase,
    pack?: string | number | null,
    machineId?: number | null
  ): boolean {
    const values = this.paramValues();
    const statuses = this.paramStatuses();

    return this.getEditableParamsForPhase(job, phase)
      .filter(param =>
        (param.pack ?? null) === (pack ?? null) &&
        (param.machineId ?? null) === (machineId ?? null)
      )
      .every(param => {
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

  getExcludedSignoffUsersForPack(
    group: PhasePackGroup,
    currentParam: JobPartParam
  ): string[] {
    return group.params
      .filter(param => param.config?.startsWith('SIGN('))
      .filter(param => param.partParamId !== currentParam.partParamId)
      .map(param => this.getParamCurrentValue(param))
      .filter(value => value !== '');
  }

  getExcludedSignoffUsers(
    job: JobWithOnePart,
    phase: JobPartPhase,
    currentParam: JobPartParam
  ): string[] {
    return this.getSignParamsForPhase(job, phase)
      .filter(param => param.partParamId !== currentParam.partParamId)
      .filter(param =>
        (param.pack ?? null) === (currentParam.pack ?? null) &&
        (param.machineId ?? null) === (currentParam.machineId ?? null)
      )
      .map(param => this.getParamCurrentValue(param))
      .filter(value => value !== '');
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
    const param = this.selectedWastageParam();

    if (param) {
      this.onParamValueChanged({
        param,
        value: 'YES'
      });
    }

    this.closeWastageDialog();
  }

  hasPackColumn(job: JobWithOnePart, phase: JobPartPhase): boolean {
    return this.getPackGroupsForPhase(job, phase)
      .some(group => group.pack !== null && group.pack !== undefined);
  }

  hasMachineColumn(phase: JobPartPhase): boolean {
    return (phase.phaseUsage & 8) > 0;
  }

  private isAwaitParam(param: JobPartParam): boolean {
    return !!param.config?.startsWith('AWAIT(');
  }

  private isAwaitParamPending(param: JobPartParam): boolean {
    return this.isAwaitParam(param) && this.getParamCurrentValue(param) === '';
  }

  isParamDisabled(
    job: JobWithOnePart,
    phase: JobPartPhase,
    group: PhasePackGroup,
    currentParam: JobPartParam
  ): boolean {
    if (!this.isPhaseActive(phase)) {
      return true;
    }

    if (phase.status !== JobStatus.READY || this.isPlaceholderParam(currentParam)) {
      return false;
    }

    const rowParams = [
      ...this.getDisplayNonSignParamsForPackRow(job, phase, group),
      ...this.getDisplaySignParamsForPackRow(job, phase, group)
    ];

    const currentIndex = rowParams.findIndex(
      param => param.partParamId === currentParam.partParamId
    );

    if (currentIndex <= 0) {
      return false;
    }

    return rowParams
      .slice(0, currentIndex)
      .some(param =>
        !this.isPlaceholderParam(param) &&
        this.isAwaitParamPending(param)
      );
  }

  isPhotoUploading(param: JobPartParam): boolean {
    return this.photoUploading() &&
      this.selectedPhotoParam()?.partParamId === param.partParamId;
  }

  async openCameraDialog(event: { param: JobPartParam }): Promise<void> {
    if (this.photoUploading()) {
      return;
    }

    this.selectedPhotoParam.set(event.param);
    this.cameraError.set(null);

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });

      this.cameraOpen.set(true);

      setTimeout(async () => {
        const video = this.cameraVideoRef?.nativeElement;

        if (!video || !this.cameraStream) {
          this.cameraError.set('Camera preview unavailable');
          return;
        }

        video.srcObject = this.cameraStream;
        video.muted = true;
        video.playsInline = true;

        try {
          await video.play();
        } catch (err) {
          console.error('Video play failed', err);
          this.cameraError.set('Unable to start camera preview');
        }
      }, 0);
    } catch (err) {
      console.error('Camera access failed', err);
      this.cameraFileInputRef?.nativeElement.click();
    }
  }

  async captureCameraPhoto(): Promise<void> {
    const video = this.cameraVideoRef?.nativeElement;

    if (!video || this.photoUploading()) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      this.cameraError.set('Unable to capture photo');
      return;
    }

    context.drawImage(video, 0, 0);

    canvas.toBlob(async blob => {
      if (!blob) {
        this.cameraError.set('Unable to capture photo');
        return;
      }

      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      await this.uploadCameraPhoto(file);
      this.closeCameraDialog();
    }, 'image/jpeg', 0.9);
  }

  async onCameraFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    await this.uploadCameraPhoto(file);
    input.value = '';
  }

  private async uploadCameraPhoto(file: File): Promise<void> {
    const param = this.selectedPhotoParam();

    if (!param) {
      this.cameraError.set('No photo parameter selected');
      return;
    }

    this.photoUploading.set(true);
    this.cameraError.set(null);

    try {
      const uploadedValue = await this.jobService.uploadPhoto(this.job().number, this.job().partNumber, file, param);

      this.onParamValueChanged({
        param,
        value: uploadedValue
      });
    } catch (err) {
      console.error('Failed to upload photo', err);
      this.cameraError.set('Failed to upload photo');
    } finally {
      this.photoUploading.set(false);
    }
  }

  closeCameraDialog(): void {
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = undefined;
    this.cameraOpen.set(false);
  }
}
