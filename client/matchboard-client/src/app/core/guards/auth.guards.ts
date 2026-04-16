import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { DeviceService } from '../services/device.service';

export const jobGuard: CanActivateFn = () => {
  const deviceService = inject(DeviceService);
  const router = inject(Router);

  const status = deviceService.getStatus();

  if (!status) {
    return router.createUrlTree(['/login']);
  }

  if (status.users.length === 0) {
    return router.createUrlTree(['/login']);
  }

  return true;
};

export const adminGuard: CanActivateFn = () => {
  const device = inject(DeviceService);
  const router = inject(Router);

  const status = device.status();

  if (!status || status.users[0].role !== 'ADMIN') {
    router.navigate(['/login']);
    return false;
  }

  return true;
};