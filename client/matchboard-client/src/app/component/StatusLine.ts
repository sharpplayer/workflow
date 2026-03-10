import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService, DeviceStatus } from '../core/device.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'status-line',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="status-line" *ngIf="status$ | async as status">
      Device ID: <strong>{{ status.deviceId }}</strong>
    </div>
    <div *ngIf="!(status$ | async)">
      Loading device info...
    </div>
  `
})
export class StatusLine {
  private deviceService = inject(DeviceService);
  status$ = this.deviceService.status$;
}