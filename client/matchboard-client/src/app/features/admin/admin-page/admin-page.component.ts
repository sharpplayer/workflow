import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { DeviceService } from '../../../core/services/device.service';
import { API_BASE_URL } from '../../../app.config';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="admin-container">

    <header class="admin-header">
      <h1>Admin Dashboard</h1>
      <button (click)="logout()" [disabled]="!status()">Logout</button>
    </header>

    <div class="admin-body">
      <aside class="admin-sidebar">
        <a routerLink="users">Users</a>
        <a routerLink="products">Products</a>
        <a routerLink="jobs">Jobs</a>
        <a routerLink="config">Config</a>
      </aside>

      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>

  </div>
  `,
  styleUrls: ['./admin-page.component.css']
})
export class AdminPageComponent {
  private deviceService = inject(DeviceService);
  private router = inject(Router);

  status = this.deviceService.status;

  async logout() {
    const currentStatus = this.status();
    if (!currentStatus) return;

    const username = currentStatus.users[0]; // adjust if multiple users
    try {
      const newStatus = await fetch(`${API_BASE_URL}/api/session/${username}`, {
        method: 'DELETE',
        credentials: 'include'
      }).then(res => res.json());

      this.deviceService.setStatus(newStatus);
      this.router.navigate(['/login']);
    } catch (err) {
      console.error('Logout failed', err);
    }
  }
}