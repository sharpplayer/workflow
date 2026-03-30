import { Routes } from '@angular/router';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { unsavedChangesGuard } from './admin.guards';
import { adminGuard } from '../../core/guards/auth.guards';
import { AdminProductsComponent } from './admin-products/admin-products.component';
import { AdminJobsComponent } from './admin-jobs/admin-jobs.component';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'jobs', pathMatch: 'full' },
      { path: 'jobs', component: AdminJobsComponent },
      { path: 'users', component: AdminUsersComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'products', component: AdminProductsComponent },
      { path: 'config', component: AdminProductsComponent }
    ]
  }
];  