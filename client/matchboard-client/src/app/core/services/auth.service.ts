import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';
import { DeviceService, DeviceStatus } from './device.service';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private deviceService = inject(DeviceService);

  async registerSession(
    username: string,
    password: string,
    adminMode: boolean
  ): Promise<DeviceStatus> {

    const status = await firstValueFrom(
      this.http.post<DeviceStatus>(
        `${API_BASE_URL}/api/session`,
        { username, password, admin: adminMode },
        { withCredentials: true }
      )
    );

    this.deviceService.setStatus(status);

    return status;
  }
}