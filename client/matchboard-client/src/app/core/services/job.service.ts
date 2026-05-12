import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";
import { Product } from "./product.service";
import { LoginResult } from "../../features/login/login/login.component";

export interface ScheduledJobPhases {
  scheduled: ScheduledJobPhase[];
}

export interface ScheduledJobPhase {
  jobNumber: number;
  jobParts: number;
  jobPartId: number;
  partNumber: number;
  name: string;
  oldName: string;
  quantity: number;
  status: number;
  phaseDescription: string;
  phaseNumber: number;
  specialInstruction: string;
  phaseStatus: number;
}

export interface SchedulableJobPart {
  operationId?: number;
  jobPartId: number;
  jobId: number;
  jobNumber: number;
  product: string;
  oldName: string;
  machineId: number;
  quantity: number;
  stepNumber: number;
  width: number;
  length: number;
  thickness: number;
  partStatus: JobStatus;
  jobStatus: JobStatus;
  partNo: number;
  jobParts: number;
  dueDate: Date;
  timeOnMachineSeconds: number;
  timeForPacksSeconds: number;
  steps: number;
  productId: number;
  locked?: boolean;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  setupMinutes?: number;
  plannedMinutes?: number;
  breakMinutes?: number;
  packMinutes?: number;
}

export interface SchedulableJobParts {
  schedulable: SchedulableJobPart[];
}

export interface JobPartPhase {
  phaseId: number;
  partId: number;
  phaseNumber: number;
  specialInstructions: string | null;
  status: JobStatus;
  description: string;
  phaseUsage: number;
}

export interface JobPartParam {
  partParamId: number;
  originalParamId?: number;
  partPhaseId: number;
  phaseId: number;
  phaseNumber: number;
  input: number;
  name: string;
  value: string | null;
  valuedAt: Date | null;
  config: string;
  status: ParamStatus;
  machineId: number | null;
  pack: number | null;
};

export interface JobPart {
  jobPartId: number;
  productId: number;
  name: string;
  oldName: string;
  quantity: number;
  fromCallOff: boolean;
  materialAvailable: boolean;
  scheduleFor: Date;
  phases: JobPartPhase[];
  params: JobPartParam[];
  status: number;
  machineIds: number[] | null;
  packSize: number;
};

export interface Job {
  id: number;
  number: number;
  due: Date;
  customer: number | null;
  carrier: number | null;
  callOff: boolean;
  paymentConfirmed: Date;
  parts: JobPart[];
  status: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  zone: string;
  contact: string;
  contactNumber: string;
  enabled: boolean;
}

export interface Carrier {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
}

export interface JobWithOnePart {
  id: number;
  number: number;
  due: Date;
  customer: Customer | null;
  carrier: Carrier | null;
  callOff: boolean;
  paymentConfirmed: Date;
  part: JobPart;
  status: number;
  partNumber: number;
  parts: number;
  product: Product;
  activePhase: number | null;
}

export interface CreateJobPartParam {
  paramId: number;
  phaseNumber: number;
  value: string;
  pack: number | null;
}

export interface CreateJobPart {
  productId: number;
  quantity: number;
  fromCallOff: boolean;
  materialAvailable: boolean;
  phases: CreateJobPartPhase[];
  params: CreateJobPartParam[]
}

export interface CreateJobPartPhase {
  phaseId: number;
  specialInstructions: string;
}

export interface CreateJob {
  due: string;
  customer: number;
  carrier: number;
  callOff: boolean;
  paymentConfirmed: string | null;
  parts: CreateJobPart[];
}

export interface JobView {
  id: number;
  number: number;
  parts: number;
  due: Date;
  customer: string;
  status: JobStatus;
}

interface JobViews {
  jobs: JobView[];
}

export interface CreateScheduledJobPart {
  jobId: number;
  jobPartId: number;
  machineId: number;
  stepNumber: number;
  quantity: number;
  setupMinutes: number;
  plannedMinutes: number;
  breakMinutes: number;
  packMinutes: number;
  plannedStartAt: string;
  plannedFinishAt: string;
  scheduledDate: string;
  position: number;
  productId: number;
}

export enum JobStatus {
  NEW = 0,
  SAVED = 1,
  AWAITING_MATERIAL = 2,
  PARTIALLY_SCHEDULABLE = 3,
  SCHEDULABLE = 4,
  PARTIALLY_SCHEDULED = 5,
  SCHEDULED = 6,
  COMPLETED = 7,
  PARTIALLY_COMPLETED = 8,
  AWAITING = 9,
  STARTED = 10,
  AWAITING_PAYMENT = 11,
  READY = 12
}

export enum ParamStatus {
  INITIALISED = 1,
  MATCHING = 2,
  UNMATCHING = 3
}

export interface ScheduledJobPartView {
  operationId: number;
  dueDate: string;          // ISO datetime (OffsetDateTime)
  jobNumber: number;
  partNumber: number;
  jobParts: number;
  productName: string;
  customerId: number | null;
  quantity: number;
  profile: string;
  length: number;
  width: number;
  thickness: number;
  material: string;
  pitch: string;
  edge: string;
  finish: string;
  plannedStart: string | null;
  plannedFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  plannedMinutes: number;
  setupMinutes: number;
  breakMinutes: number;
  packMinutes: number;
  status: JobStatus;
  actualStartParamId: number,
  firstOffParamId: number | null;
  actualFinishParamId: number,
  jobId: number;
  jobPartId: number;
  machineId: number;
  stepNumber: number;
  firstOffAt: string | null;
}

export interface ParamSignOff {
  value: string;
  paramStatus: ParamStatus;
}

export interface ScheduledJobPartViews {
  jobParts: ScheduledJobPartView[];
}

export const JobStatusLabel: Record<JobStatus, string> = {
  [JobStatus.NEW]: "(New)",
  [JobStatus.SAVED]: "Saved",
  [JobStatus.AWAITING_MATERIAL]: "Awaiting Material",
  [JobStatus.PARTIALLY_SCHEDULABLE]: "Partially Schedulable",
  [JobStatus.SCHEDULABLE]: "Schedulable",
  [JobStatus.PARTIALLY_SCHEDULED]: "Partially Scheduled",
  [JobStatus.SCHEDULED]: "Scheduled",
  [JobStatus.COMPLETED]: "Completed",
  [JobStatus.PARTIALLY_COMPLETED]: "Partially Completed",
  [JobStatus.AWAITING]: "Awaiting",
  [JobStatus.STARTED]: "Started",
  [JobStatus.AWAITING_PAYMENT]: "Awaiting Payment",
  [JobStatus.READY]: "Ready"
};

export interface WastageView {
  rpi: number;
  quantity: number;
  reportedBy: string;
  reason: string;
  date: string;
}

export interface Wastages {
  wastages: WastageView[];
}

export interface CreateWastage {
  jobPhaseId: number;
  rpi: number;
  quantity: number;
  category: number;
  reportedBy: string;
  reason: string;
}

export interface ScheduleView {
  date: string;
  machineId : number;
  machine: string;
}

export interface ScheduleViews {
  schedules: ScheduleView[];
}

@Injectable({ providedIn: 'root' })
export class JobService {

  private http = inject(HttpClient);

  async createJob(job: CreateJob): Promise<Job> {
    return await firstValueFrom(
      this.http.post<Job>(
        `${API_BASE_URL}/api/jobs`,
        job,
        { withCredentials: true }
      )
    );
  }

  async updateJob(jobId: number, job: CreateJob): Promise<Job> {
    return await firstValueFrom(
      this.http.patch<Job>(
        `${API_BASE_URL}/api/jobs/${jobId}`,
        job,
        { withCredentials: true }
      )
    );
  }

  async getJob(jobId: number): Promise<Job> {
    return await firstValueFrom(
      this.http.get<Job>(
        `${API_BASE_URL}/api/jobs/${jobId}`,
        { withCredentials: true }
      )
    );
  }

  async getJobs(toNumber: number | null, count: number): Promise<JobView[]> {
    const params: any = { count };

    if (toNumber != null) {
      params.toNumber = toNumber;
    }

    const jobs = await firstValueFrom(
      this.http.get<JobViews>(
        `${API_BASE_URL}/api/jobs`,
        {
          params,
          withCredentials: true
        }
      )
    );

    return jobs.jobs;
  }

  async nextJob(role: string): Promise<JobWithOnePart | null> {
    return await firstValueFrom(
      this.http.get<JobWithOnePart | null>(
        `${API_BASE_URL}/api/jobs/next`,
        {
          params: { role },
          withCredentials: true
        }
      )
    );
  }

  async getJobSchedulableParts(): Promise<SchedulableJobPart[]> {

    const jobs = await firstValueFrom(
      this.http.get<SchedulableJobParts>(`${API_BASE_URL}/api/schedule`, {
        withCredentials: true
      })
    );
    return jobs.schedulable;
  }

  async getJobsForMachine(
    machineId: number,
    date?: string | null
  ): Promise<ScheduledJobPartView[]> {

    const jobs = await firstValueFrom(
      this.http.get<ScheduledJobPartViews>(`${API_BASE_URL}/api/schedule`, {
        params: date ? { date, machineId: machineId.toString() } : { machineId: machineId.toString() },
        withCredentials: true
      })
    );
    return jobs.jobParts;
  }

  async getJobsForScheduleDate(date: string): Promise<ScheduledJobPartView[]> {
    const jobs = await firstValueFrom(
      this.http.get<ScheduledJobPartViews>(`${API_BASE_URL}/api/schedule`, {
        params: { date },
        withCredentials: true
      })
    );

    return jobs.jobParts ?? [];
  }

  async getJobScheduledPhases(date: string | null, role: string): Promise<ScheduledJobPhases> {

    return await firstValueFrom(
      this.http.get<ScheduledJobPhases>(`${API_BASE_URL}/api/schedule`, {
        params: date ? { date, role } : { role },
        withCredentials: true
      })
    );
  }

  async getSchedules(fromDate: string | null, toDate: string | null, limit: number): Promise<ScheduleView[]> {
    const params: Record<string, string> = { limit: limit.toString() };

    if (fromDate) {
      params['fromDate'] = fromDate;
    }
    if (toDate) {
      params['toDate'] = toDate;
    }

    const schedules = await firstValueFrom(
      this.http.get<ScheduleViews>(`${API_BASE_URL}/api/schedules`, {
        params,
        withCredentials: true
      })
    );

    return schedules.schedules;
  }

  async submitSchedule(jobParts: CreateScheduledJobPart[]) {
    try {
      return await firstValueFrom(
        this.http.post<boolean>(`${API_BASE_URL}/api/schedule`, { jobParts },
          { withCredentials: true })
      );
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Failed to submit schedule.'));
    }

  }

  getJobRef(jobNumber: number) {
    return (jobNumber % 1000).toString().padStart(3, '0');
  }

  async createRpi(jobId: number, jobPartId: number, rpi: number) {
    try {
      let job = await firstValueFrom(
        this.http.post<JobWithOnePart | null>(
          `${API_BASE_URL}/api/jobs/${jobId}/part/${jobPartId}/rpi/${rpi}`,
          {},
          { withCredentials: true }
        )
      );
      return job; // success
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Signoff failed.'));
    }
  }

  async signOff(loginResult: LoginResult, paramData: Record<number, ParamSignOff>, operationId?: number): Promise<JobWithOnePart | null> {
    try {
      let job = await firstValueFrom(
        this.http.patch<JobWithOnePart | null>(
          `${API_BASE_URL}/api/phase`,
          { user: loginResult.username, password: loginResult.credential, pin: loginResult.pin, role: loginResult.role, paramData, ...(operationId !== undefined && { operationId }), ...(loginResult.rpiNumber !== undefined && { rpi: loginResult.rpiNumber }) },
          { withCredentials: true }
        )
      );
      return job; // success
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Signoff failed.'));
    }
  }

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      return err.error?.message || err.message || fallback;
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  }

  async getWastageForJobPhase(jobPhaseId: number): Promise<WastageView[]> {
    try {
      let wastage = await firstValueFrom(
        this.http.get<Wastages>(
          `${API_BASE_URL}/api/wastage`,
          {
            params: { jobPhaseId },
            withCredentials: true
          }
        )
      );
      return wastage.wastages; // success
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Get wastage failed.'));
    }
  }

  async createWastage(wastage: CreateWastage): Promise<WastageView> {
    try {
      let res = await firstValueFrom(
        this.http.post<WastageView>(
          `${API_BASE_URL}/api/wastage`,
          wastage,
          {
            withCredentials: true
          }
        )
      );
      return res; // success
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Get wastage failed.'));
    }
  }

  async uploadPhoto(jobNumber: number, jobPart: number, file: File, param: JobPartParam): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await firstValueFrom(
        this.http.post<{ value: string }>(`${API_BASE_URL}/api/jobs/${jobNumber}/part/${jobPart}/phase/${param.phaseNumber}/param/${param.partParamId}`, formData)
      );
      return response.value;
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Get wastage failed.'));
    }
  }
}
