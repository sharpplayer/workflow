// app.config.ts
import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { DeviceService } from './core/device.service';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const API_CONFIG = {
  host: window.location.hostname, 
  port: '8080',                   
  protocol: window.location.protocol 
};

// Build full URL
export const API_BASE_URL = `${API_CONFIG.protocol}//${API_CONFIG.host}:${API_CONFIG.port}`;

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    provideHttpClient(),
    provideAppInitializer(() => {
      const deviceService = inject(DeviceService);
      return deviceService.registerDevice().catch(err => {
        console.error('Device registration failed', err);
      });
    }),
  ],
};