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
  dueDate: Date
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
  config: string;
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
};

export interface Job {
  id: number;
  number: number;
  due: Date;
  customer: number | null;
  carrier: number | null;
  callOff: boolean;
  paymentReceived: boolean;
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
  paymentReceived: boolean;
  part: JobPart;
  status: number;
  partNumber: number;
  parts: number;
  product: Product;
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
    return await firstValueFrom(
      this.http.get<Job>(
        `${API_BASE_URL}/api/jobs/${jobId}`,
        { withCredentials: true }
      )
    );
  }

  async nextJob(role: string): Promise<JobWithOnePart> {
    return await firstValueFrom(
      this.http.get<JobWithOnePart>(
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

  getJobRef(jobNumber: number) {
    return (jobNumber % 1000).toString().padStart(3, '0');
  }

  async signOff(loginResult: LoginResult, paramData: Record<number, string>): Promise<JobWithOnePart> {
    try {
      let job = await firstValueFrom(
        this.http.patch<JobWithOnePart>(
          `${API_BASE_URL}/api/phase`,
          { user: loginResult.username, password: loginResult.credential, pin: loginResult.pin, role: loginResult.role, paramData },
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
}