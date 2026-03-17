import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';

export interface DeviceStatus {
  deviceId: string;
  users: string[];
  mode: string;
  passwordReset: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private http = inject(HttpClient);

  private statusSignal = signal<DeviceStatus | undefined>(undefined);

  // readonly view for consumers
  status = this.statusSignal.asReadonly();

  async registerDevice(): Promise<DeviceStatus> {
    const status = await firstValueFrom(
      this.http.post<DeviceStatus>(
        `${API_BASE_URL}/api/device`,
        {},
        { withCredentials: true }
      )
    );

    this.statusSignal.set(status);
    return status;
  }

  setStatus(status: DeviceStatus) {
    this.statusSignal.set(status);
  }

  getStatus(): DeviceStatus {
    const status = this.statusSignal();
    if (!status) throw new Error('Device not yet registered');
    return status;
  }
}