import { computed, inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';
import { DeviceService, DeviceStatus } from './device.service';
import { Router } from '@angular/router';
import { LoggedOnOperator } from '../../features/job/job-phase-param/job-phase-param.component';

export interface ResetResult {
  username: string;
  credential: string;
  pin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private deviceService = inject(DeviceService);
  private router = inject(Router);

  readonly loggedOnOperators = computed<LoggedOnOperator[]>(() => {
    const status = this.deviceService.status();
    const users = status?.users ?? [];

    return users
      .map(user => ({
        username: user.user?.trim() ?? '',
        role: user.role?.trim() ?? ''
      }))
      .filter(user => !!user.username);
  });

  async registerSession(
    username: string,
    password: string,
    role: string
  ): Promise<DeviceStatus> {
    try {
      const status = await firstValueFrom(
        this.http.post<DeviceStatus>(
          `${API_BASE_URL}/api/session`,
          { username, password, role },
          { withCredentials: true }
        )
      );

      this.deviceService.setStatus(status);
      return status;
    } catch (err) {
      throw new Error(this.getErrorMessage(err, 'Login failed.'));
    }
  }

  async resetPassword(reset: ResetResult): Promise<DeviceStatus> {
    const status = await firstValueFrom(
      this.http.patch<DeviceStatus>(
        `${API_BASE_URL}/api/session`,
        {
          username: reset.username,
          password: reset.credential,
          pin: reset.pin
        },
        { withCredentials: true }
      )
    );

    this.deviceService.setStatus(status);
    return status;
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

  redirectAfterLogin(status: DeviceStatus, username: string = '') {
    if (status.passwordReset) {
      return this.router.navigate(['/reset-password'], {
        queryParams: { username }
      });
    }


    if (status.users.length == 0) {
      return this.router.navigate(['/login']);
    }

    const role = status.users[0].role;



    if (role === 'ADMIN') {
      return this.router.navigate(['/admin'], {
        state: { username, role: role }
      });
    }

    return this.router.navigate(['/job'], {
      state: { username, role: role }
    });
  }

  async logout(username: string) {
    try {
      const newStatus = await firstValueFrom(
        this.http.delete<DeviceStatus>(
          `${API_BASE_URL}/api/session/${username}`,
          { withCredentials: true }
        )
      );

      this.deviceService.setStatus(newStatus);
      this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
    }

  }

  async logoutAll() {
    try {
      const newStatus = await firstValueFrom(
        this.http.delete<DeviceStatus>(
          `${API_BASE_URL}/api/session`,
          { withCredentials: true }
        )
      );

      this.deviceService.setStatus(newStatus);
      this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
    }

  }

}