import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'status-line',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-line" *ngIf="status() as s; else loading">
      Device ID: <strong>{{ s.deviceId }}</strong>
    </div>

    <ng-template #loading>
      Loading device info...
    </ng-template>
  `,
  styleUrl: './status-line.component.css'
})
export class StatusLine {
  private deviceService = inject(DeviceService);
  status = this.deviceService.status;
}