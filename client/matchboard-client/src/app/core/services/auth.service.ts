import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';
import { DeviceService, DeviceStatus } from './device.service';
import { Router } from '@angular/router';
import { LoginResult } from '../../features/login/login/login.component';

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

  private getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      return err.error?.message || err.message || fallback;
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  }


  async completeJob(phaseId: string, loginResult: LoginResult): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post<void>(
          `${API_BASE_URL}/api/phase`,
          { phaseId, user: loginResult.username, password: loginResult.credential, pin: loginResult.pin },
          { withCredentials: true }
        )
      );
      return true; // success
    } catch (err) {
      // Here, err is an HttpErrorResponse
      console.warn('Job completion failed', err);
      return false; // treat any error (404, 500, etc.) as false
    }
  }

  redirectAfterLogin(status: DeviceStatus, username: string = "") {
    if (status.passwordReset) {
      return this.router.navigate(['/reset-password'], {
        queryParams: { username, mode: status.mode }
      });
    }

    switch (status.mode) {
      case 'job':
        return this.router.navigate(['/job']);
      case 'admin':
        return this.router.navigate(['/admin']);
      default:
        return this.router.navigate(['/login']);
    }
  }

  async resetPassword(reset: ResetResult): Promise<DeviceStatus> {

    const status = await firstValueFrom(
      this.http.patch<DeviceStatus>(
        `${API_BASE_URL}/api/session`,
        { 'username': reset.username, 'password': reset.credential, 'pin': reset.pin },
        { withCredentials: true }
      )
    );
    this.deviceService.setStatus(status);
    return status;

  }
}