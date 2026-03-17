import { Routes } from '@angular/router';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { ProductsComponent } from './admin-products/admin-products.component';
import { JobsComponent } from './admin-products/admin-products.component';
import { ConfigComponent } from './admin-products/admin-products.component';
import { unsavedChangesGuard } from './admin.guards';
import { adminGuard } from '../../core/guards/auth.guards';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: AdminUsersComponent, canDeactivate: [unsavedChangesGuard] },
      { path: 'products', component: ProductsComponent },
      { path: 'jobs', component: JobsComponent },
      { path: 'config', component: ConfigComponent }
    ]
  }
];  