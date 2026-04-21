import { Component, computed, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { DeviceService } from '../../../core/services/device.service';
import { AuthService } from '../../../core/services/auth.service';

type AdminSubnavItem = {
  label: string;
  link: string;
};

type AdminRouteData = {
  title?: string;
  breadcrumb?: string;
  subnav?: AdminSubnavItem[];
};

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell">
      <header class="admin-header">
        <div class="admin-header-left">
          <div class="admin-title-group">
            <h1>{{ pageData().title || 'Admin' }}</h1>
            <div class="admin-breadcrumb">
              {{ pageData().breadcrumb || 'Dashboard' }}
            </div>
          </div>
        </div>

        <nav class="admin-header-nav" aria-label="Section actions">
          @for (item of pageData().subnav ?? []; track item.label) {
            <a
              class="top-link"
              [routerLink]="item.link"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="admin-header-right">
          <button (click)="logout()" [disabled]="!status()">Logout</button>
        </div>
      </header>

      <div class="admin-body">
        <aside class="admin-sidebar">
          <a routerLink="jobs" routerLinkActive="active">Jobs</a>
          <a routerLink="schedule" routerLinkActive="active">Schedule</a>
          <a routerLink="products" routerLinkActive="active">Products</a>
          <a routerLink="users" routerLinkActive="active">Users</a>
          <a routerLink="config" routerLinkActive="active">Config</a>
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
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private deviceService = inject(DeviceService);
  private authService = inject(AuthService);

  status = this.deviceService.status;

  private routeData = signal<AdminRouteData>({});

  pageData = computed(() => this.routeData());

  constructor() {
    this.updateRouteData();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateRouteData();
      });
  }

  private updateRouteData(): void {
    this.routeData.set(this.collectRouteData(this.activatedRoute));
  }

  private collectRouteData(route: ActivatedRoute): AdminRouteData {
    let current: ActivatedRoute | null = route;
    let merged: AdminRouteData = {};

    while (current) {
      if (current.snapshot?.data) {
        merged = { ...merged, ...(current.snapshot.data as AdminRouteData) };
      }
      current = current.firstChild;
    }

    return merged;
  }

  logout(): void {
    const currentStatus = this.status();
    if (!currentStatus) return;

    this.authService.logout(currentStatus.users[0].user);
  }
}