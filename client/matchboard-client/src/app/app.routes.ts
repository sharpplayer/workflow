// app.routes.ts
import { Routes } from '@angular/router';
import { LoginPageComponent } from './features/login/login-page/login-page.component';
import { JobPageComponent } from './features/job/job-page.component';
import { AdminPageComponent } from './features/admin/admin-page.component';
import { adminGuard, jobGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  { path: 'login',  component: LoginPageComponent  },
  { path: 'job',    component: JobPageComponent,   canActivate: [jobGuard] },
  { path: 'admin',  component: AdminPageComponent, canActivate: [adminGuard] },
  { path: '**',     redirectTo: '/login' }
];