import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";

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
  phases: CreateJobPartPhase[];
  params: CreateJobPartParam[];
  status: number;
}

export interface CreateJobPartPhase {
  phaseId: number;
  specialInstructions: string;
  status: number;
}

export interface CreateJob {
  due: Date;
  customer: number;
  carrier: number;
  callOff: boolean;
  parts: CreateJobPart[];
  status: number;
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
}