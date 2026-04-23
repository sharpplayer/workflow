import { Routes } from '@angular/router';
import { LoginPageComponent } from './features/login/login-page/login-page.component';
import { JobPageComponent } from './features/job/job-page/job-page.component';
import { adminRoutes } from './features/admin/admin.routes';
import { jobGuard } from './core/guards/auth.guards';
import { ResetPageComponent } from './features/login/reset-page/reset-page.component';
import { SchedulePageComponent } from './features/job/schedule-page/schedule-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'reset-password', component: ResetPageComponent },
  ...adminRoutes,
  { path: 'schedule/:workstationId', component: SchedulePageComponent },
  { path: 'job', component: JobPageComponent, canActivate: [jobGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];