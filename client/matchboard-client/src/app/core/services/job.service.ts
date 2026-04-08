import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";
import { ConfigItem } from "./config.service";

type JobPart = any;
export interface Job {
  id: number;
  number: number; // Java long → number (note below)
  due: Date;      // LocalDateTime → Date
  customer: number | null;
  carrier: number | null;
  callOff: boolean;
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
}