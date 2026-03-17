import { Component, effect, inject, signal } from '@angular/core';
import { StatusLine } from './core/components/status-line/status-line.component';
import { DeviceService } from './core/services/device.service';
import { AuthService } from './core/services/auth.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, StatusLine],
  template: `
  <header class="app-header">
    <h1>Matchboard</h1>
  </header>
  <div class="main-content">
    <router-outlet />
  </div>
  <footer class="status-bar">
    <status-line />
  </footer>
  `,
  styleUrl: './app.css'
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