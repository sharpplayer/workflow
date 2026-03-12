import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';

export interface DeviceStatus {
  deviceId: string;
  users: string[];
  mode: string;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private statusSubject = new BehaviorSubject<DeviceStatus | undefined>(undefined);
  status$ = this.statusSubject.asObservable();

  constructor(private http: HttpClient) { }

  async registerDevice(): Promise<DeviceStatus> {
    const status = await firstValueFrom(
      this.http.post<DeviceStatus>(`${API_BASE_URL}/device`, {}, { withCredentials: true })
    );
    this.statusSubject.next(status);
    return status;
  }

  getStatus(): DeviceStatus {
    const status = this.statusSubject.value;
    if (!status) throw new Error('Device not yet registered');
    return status;
  }
}