import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { DeviceService } from '../services/device.service';

export const jobGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const status = inject(DeviceService).getStatus();

  if (status?.mode !== 'job') return router.createUrlTree(['/login']);
  return true;
};

export const adminGuard = (): boolean | UrlTree => {
  const router = inject(Router);
  const status = inject(DeviceService).getStatus();

  if (status?.mode !== 'admin') return router.createUrlTree(['/login']);
  return true;
};