import { ApplicationRef, ComponentRef, computed, createComponent, EnvironmentInjector, inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Subject } from 'rxjs';
import { API_BASE_URL } from '../../app.config';
import { DeviceService, DeviceStatus } from './device.service';
import { Router } from '@angular/router';
import { LoggedOnOperator } from '../../features/job/job-phase-param/job-phase-param.component';
import { LoginComponent, LoginResult } from '../../features/login/login/login.component';
import { LoginResetComponent } from '../../features/login/reset/reset.component';

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

    if (status.users.length === 0) {
      return this.router.navigate(['/login']);
    }

    const user = status.users[0];
    const role = user.role;
    const workstation = user.workstation;

    if (role === 'ADMIN') {
      return this.router.navigate(['/admin'], {
        state: { username, role }
      });
    }

    if (workstation !== 0) {
      return this.router.navigate(['/schedule', workstation], {
        state: { username, role, workstation }
      });
    }

    return this.router.navigate(['/job'], {
      state: { username, role }
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

  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly appRef = inject(ApplicationRef);

  async open(params: {
    username?: string;
    role?: string;
  }): Promise<LoginResult | null> {
    const result$ = new Subject<LoginResult | null>();

    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 9999 !important;
      background: rgba(0,0,0,0.55) !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
    document.body.appendChild(container);

    let currentRef: ComponentRef<LoginComponent | LoginResetComponent> | null = null;

    const destroyCurrent = (): void => {
      if (currentRef) {
        this.appRef.detachView(currentRef.hostView);
        currentRef.destroy();
        currentRef = null;
      }
    };

    const cleanup = (): void => {
      destroyCurrent();
      container.remove();
      result$.complete();
    };

    const mount = (ref: ComponentRef<LoginComponent | LoginResetComponent>): void => {
      this.appRef.attachView(ref.hostView);
      const domElem = ref.location.nativeElement as HTMLElement;
      container.appendChild(domElem);
      currentRef = ref;
    };

    const showReset = (userNameValue: string, mode: 'password' | 'pin' = 'password'): void => {
      destroyCurrent();

      const ref = createComponent(LoginResetComponent, {
        environmentInjector: this.environmentInjector
      });

      ref.setInput('username', userNameValue);

      if (mode === 'pin') {
        ref.setInput('mode', 'pin');
      }

      ref.instance.passwordReset.subscribe((resetResult: ResetResult) => {
        this.resetPassword(resetResult);
        cleanup();
      });

      mount(ref);
    };

    const showLogin = (): void => {
      destroyCurrent();

      const ref = createComponent(LoginComponent, {
        environmentInjector: this.environmentInjector
      });

      const username = params.username ?? '';
      const role = params.role ?? '';
      const mode: 'pin' | 'password' =
        username && this.deviceService.isUserLoggedIn(username) ? 'pin' : 'password';
      ref.setInput('username', username);
      ref.setInput('role', role);
      ref.setInput('mode', mode);
      ref.setInput('showCancel', true);

      ref.instance.loginSubmit.subscribe((loginResult: LoginResult) => {
        result$.next(loginResult);

        if (loginResult.passwordReset) {
          showReset(loginResult.username, 'password');
        } else if (loginResult.pinReset) {
          showReset(loginResult.username, 'pin');
        } else {
          cleanup();
        }
      });

      ref.instance.cancelled.subscribe(() => {
        result$.next(null);
        cleanup();
      });

      mount(ref);
    };

    showLogin();

    return firstValueFrom(result$);
  }
}