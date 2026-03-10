import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
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
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes)
  ]
};
