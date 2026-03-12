import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";

export interface DeviceStatus { deviceId: string; users: string[]; mode: string; }

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private http = inject(HttpClient);

  private statusSubject = new BehaviorSubject<DeviceStatus | undefined>(undefined);
  status$ = this.statusSubject.asObservable();

  async registerDevice(): Promise<DeviceStatus> {
    const status = await firstValueFrom(
      this.http.post<DeviceStatus>(`${API_BASE_URL}/api/device`, {}, { withCredentials: true })
    );

    this.setStatus(status);
    return status;
  }

  setStatus(status: DeviceStatus) {
    console.log(status)
    this.statusSubject.next(status);
  }

  getStatus(): DeviceStatus {
    const status = this.statusSubject.value;
    if (!status) throw new Error('Device not yet registered');
    return status;
  }
}