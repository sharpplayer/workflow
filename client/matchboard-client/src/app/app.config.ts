// app.config.ts
import { ApplicationConfig, provideAppInitializer, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { DeviceService } from './core/services/device.service';

export const API_CONFIG = {
  host: window.location.hostname,
  port: window.location.port === '4200' ? '8080' : window.location.port,
  protocol: window.location.protocol
};

// Build full URL
export const API_BASE_URL = window.location.port === '4200'
  ? `${API_CONFIG.protocol}//${API_CONFIG.host}:${API_CONFIG.port}`
  : window.location.origin;

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAppInitializer(async () => {
      const deviceService = inject(DeviceService);
      window.matchboardDebug?.('Registering device', { apiBaseUrl: API_BASE_URL });
      try {
        await deviceService.registerDevice();
        window.matchboardDebug?.('Device registration completed');
      } catch (err) {
        console.error('Device registration failed', err);
        window.matchboardDebug?.('Device registration failed', err);
      }
    }),
  ],
};
