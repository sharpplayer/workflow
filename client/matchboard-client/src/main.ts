import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { DeviceService } from './app/core/device.service';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

async function bootstrap() {
  // Bootstrap the app so DI works
  const appRef = await bootstrapApplication(App, {
    ...appConfig,
    providers: [importProvidersFrom(HttpClientModule)]
  });

  // Get the DeviceService instance
  const deviceService = appRef.injector.get(DeviceService);

  // Call registerDevice on startup
  try {
    const deviceStatus = await deviceService.registerDevice();
    console.log('Device registered:', deviceStatus);
  } catch (err) {
    console.error('Device registration failed', err);
  }
}

bootstrap();