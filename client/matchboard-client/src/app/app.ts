import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';
import { DeviceService, DeviceStatus } from './core/services/device.service';
import { StatusLine } from './core/components/status-line/status-line.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, StatusLine],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private deviceService = inject(DeviceService);
  private router = inject(Router);
  protected readonly title = signal('matchboard-client');

  ngOnInit(): void {
    this.deviceService.status$.pipe(
      filter((status): status is DeviceStatus => !!status),
      take(1)
    ).subscribe(status => {
      switch (status.mode) {
        case 'job': this.router.navigate(['/job']); break;
        case 'admin': this.router.navigate(['/admin']); break;
        default: this.router.navigate(['/login']); break;
      }
    });
  }
}
