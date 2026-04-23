import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';

export interface SessionView {
  user: string;
  role: string;
  workstation: number;
}

export interface DeviceStatus {
  deviceId: string;
  users: SessionView[];
  passwordReset: boolean
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private http = inject(HttpClient);

  private statusSignal = signal<DeviceStatus | undefined>(undefined);
  readonly status = this.statusSignal.asReadonly();

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

  async loadStatus(): Promise<DeviceStatus> {
    const status = await firstValueFrom(
      this.http.get<DeviceStatus>(
        `${API_BASE_URL}/api/device`,
        { withCredentials: true }
      )
    );

    this.statusSignal.set(status);
    return status;
  }

  setStatus(status: DeviceStatus): void {
    this.statusSignal.set(status);
  }

  clearStatus(): void {
    this.statusSignal.set(undefined);
  }

  getStatus(): DeviceStatus {
    const status = this.statusSignal();
    if (!status) {
      throw new Error('Device not yet registered');
    }
    return status;
  }

  isUserLoggedIn(user: string) {
    return this.status()?.users.filter(op => op.user === user) || false
  }
}