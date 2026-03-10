import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../app.config';

export interface DeviceStatus {
  deviceId: string;
  users?: string[];
  nextPageUri?: string;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private statusSubject = new BehaviorSubject<DeviceStatus | undefined>(undefined);
  status$ = this.statusSubject.asObservable();

  constructor(private http: HttpClient) {}

  async registerDevice(): Promise<DeviceStatus> {
    const status = await firstValueFrom(
      this.http.post<DeviceStatus>(`${API_BASE_URL}/device`, {}, { withCredentials: true })
    );
    this.statusSubject.next(status);
    return status;
  }

  getStatus() {
    return this.statusSubject.value;
  }
}