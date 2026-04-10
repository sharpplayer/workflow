import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";

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
  jobPartId: number;
  product: string;
  oldName: string;
  quantity: number;
  fromCallOff: boolean;
  jobId: number;
  jobNumber: number;
  partStatus: JobStatus;
  jobStatus: JobStatus;
  partNo: number;
  jobParts: number;
  order?: number;
}

export interface SchedulableJobParts {
  schedulable: SchedulableJobPart[];
}

export interface JobPartPhase {
  phaseId: number;
  partId: number;
  phaseNumber: number;
  specialInstructions: string | null;
  status: number;
}

export interface JobPartParam {
  partParamId: number;
  partPhaseId: number;
  phaseId: number;
  phaseNumber: number;
  input: number;
  name: string;
  value: string | null;
  valuedAt: Date | null;
};

export interface JobPart {
  jobPartId: number;
  productId: number;
  name: string;
  oldName: string;
  quantity: number;
  fromCallOff: boolean;
  materialAvailable: boolean;
  scheduleFor: Date; // equivalent to OffsetDateTime
  phases: JobPartPhase[];
  params: JobPartParam[];
  status: number;
};

export interface Job {
  id: number;
  number: number; // Java long → number (note below)
  due: Date;      // LocalDateTime → Date
  customer: number | null;
  carrier: number | null;
  callOff: boolean;
  paymentReceived: boolean;
  parts: JobPart[];
  status: number;
}

export interface CreateJobPartParam {
  paramId: number;
  phaseNumber: number;
  value: string;
}

export interface CreateJobPart {
  productId: number;
  quantity: number;
  fromCallOff: boolean;
  materialAvailable: boolean;
  scheduleFor: string | null;
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
  paymentReceived: boolean;
  parts: CreateJobPart[];
}

export enum JobStatus {
  NEW = 0,
  SAVED = 1,
  READY = 2,
  PARTIALLY_SCHEDULABLE = 3,
  SCHEDULABLE = 4,
  PARTIALLY_SCHEDULED = 5,
  SCHEDULED = 6,
  COMPLETED = 7,
  PARTIALLY_COMPLETED = 8,
  AWAITING = 9,
  STARTED = 10,
}

export const JobStatusLabel: Record<JobStatus, string> = {
  [JobStatus.NEW]: "(New)",
  [JobStatus.SAVED]: "Saved",
  [JobStatus.READY]: "Ready",
  [JobStatus.PARTIALLY_SCHEDULABLE]: "Partially Schedulable",
  [JobStatus.SCHEDULABLE]: "Schedulable",
  [JobStatus.PARTIALLY_SCHEDULED]: "Partially Scheduled",
  [JobStatus.SCHEDULED]: "Scheduled",
  [JobStatus.COMPLETED]: "Completed",
  [JobStatus.PARTIALLY_COMPLETED]: "Partially Completed",
  [JobStatus.AWAITING]: "Awaiting",
  [JobStatus.STARTED]: "Started",
};

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

  async getJob(jobId: number): Promise<Job> {
    return await firstValueFrom( //  Line 139
      this.http.get<Job>(
        `${API_BASE_URL}/api/jobs/${jobId}`,
        { withCredentials: true }
      )
    );
  }

  async nextJob(role: string): Promise<JobPart> {
    return await firstValueFrom( //  Line 139
      this.http.get<JobPart>(
        `${API_BASE_URL}/api/jobs/next`,
        {
          params: { role },
          withCredentials: true
        }
      )
    );
  }

  async getJobSchedulableParts(date: string | null): Promise<SchedulableJobParts> {

    return await firstValueFrom(
      this.http.get<SchedulableJobParts>(`${API_BASE_URL}/api/schedule`, {
        params: date ? { date } : {},
        withCredentials: true
      })
    );
  }

  async getJobScheduledPhases(date: string | null, role: string): Promise<ScheduledJobPhases> {

    return await firstValueFrom(
      this.http.get<ScheduledJobPhases>(`${API_BASE_URL}/api/schedule`, {
        params: date ? { date, role } : { role },
        withCredentials: true
      })
    );
  }

  async scheduleJobParts(date: string, jobPartIds: number[]) {
    return await firstValueFrom(
      this.http.post<SchedulableJobParts>(`${API_BASE_URL}/api/schedule`, { date, jobPartIds },
        { withCredentials: true })
    );

  }
}