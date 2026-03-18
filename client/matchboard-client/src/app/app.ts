import { Component, effect, inject, signal } from '@angular/core';
import { DeviceService } from './core/services/device.service';
import { AuthService } from './core/services/auth.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
  <div class="main-content">
    <router-outlet />
  </div>
  `
})
export class App {

  private deviceService = inject(DeviceService);
  private authService = inject(AuthService);

  protected readonly title = signal('matchboard-client');

  constructor() {
    let initialized = false;

    effect(() => {
      if (initialized) return;
      const status = this.deviceService.status();
      if (!status) return;
      initialized = true;
      this.authService.redirectAfterLogin(status);
    });
  }
}