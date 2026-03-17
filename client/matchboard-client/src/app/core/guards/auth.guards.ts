import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { DeviceService } from '../services/device.service';

export const jobGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const status = inject(DeviceService).getStatus();

  if (status?.mode !== 'job') return router.createUrlTree(['/login']);
  return true;
};

export const adminGuard: CanActivateFn = () => {
  const device = inject(DeviceService);
  const router = inject(Router);

  const status = device.status();

  if (!status || status.mode !== 'admin') {
    router.navigate(['/login']);
    return false;
  }

  return true;
};