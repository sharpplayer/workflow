import { Routes } from '@angular/router';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminProductsComponent } from './admin-products/admin-products.component';
import { AdminJobsComponent } from './admin-jobs/admin-jobs.component';
import { AdminSchedulePageComponent } from './admin-schedule-page/admin-schedule-page.component';
import { adminGuard } from '../../core/guards/auth.guards';
import { unsavedChangesGuard } from './admin.guards';
import { AdminJobListComponent } from './admin-job-list/admin-job-list.component';
import { AdminScheduleListComponent } from './admin-schedule-list/admin-schedule-list.component';
import { AdminScheduleMachineComponent } from './admin-schedule-machine/admin-schedule-machine.component';

export const adminRoutes: Routes = [
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'jobs', pathMatch: 'full' },

      // JOBS
      {
        path: 'jobs',
        data: {
          title: 'Jobs',
          breadcrumb: 'Jobs / List',
          subnav: [
            { label: 'List', link: '/admin/jobs' },
            { label: 'New', link: '/admin/jobs/new' }
          ]
        },
        children: [
          {
            path: '',
            component: AdminJobListComponent
          },
          {
            path: 'new',
            component: AdminJobsComponent,
            canDeactivate: [unsavedChangesGuard],
            data: {
              title: 'New Job',
              breadcrumb: 'Jobs / New',
              subnav: [
                { label: 'List', link: '/admin/jobs' },
                { label: 'New', link: '/admin/jobs/new' }
              ]
            }
          },
          {
            path: ':id',
            component: AdminJobsComponent,
            canDeactivate: [unsavedChangesGuard],
            data: {
              title: 'Edit Job',
              breadcrumb: 'Jobs / Edit',
              subnav: [
                { label: 'List', link: '/admin/jobs' },
                { label: 'Edit', link: '' }
              ]
            }
          }
        ]
      },

      // SCHEDULE
      {
        path: 'schedule',
        data: {
          title: 'Schedule',
          breadcrumb: 'Schedule / List',
          subnav: [
            { label: 'List', link: '/admin/schedule' },
            { label: 'New', link: '/admin/schedule/new' }
          ]
        },
        children: [
          {
            path: '',
            component: AdminScheduleListComponent
          },
          {
            path: 'new',
            component: AdminSchedulePageComponent,
            data: {
              title: 'New Schedule',
              breadcrumb: 'Schedule / New'
            }
          },
          {
            path: ':date',
            component: AdminSchedulePageComponent,
            data: {
              title: 'Schedule',
              breadcrumb: 'Schedule / View'
            }
          },
          {
            path: ':date/machine/:machineId',
            component: AdminScheduleMachineComponent,
            data: {
              title: 'Schedule',
              breadcrumb: 'Schedule / Machine'
            }
          }
        ]
      },

      // USERS
      {
        path: 'users',
        component: AdminUsersComponent,
        canDeactivate: [unsavedChangesGuard],
        data: {
          title: 'Users',
          breadcrumb: 'Users / Manage',
          subnav: [
            { label: 'List', link: '/admin/users' }
          ]
        }
      },

      // PRODUCTS
      {
        path: 'products',
        data: {
          title: 'Products',
          breadcrumb: 'Products / List',
          subnav: [
            { label: 'List', link: '/admin/products' }
          ]
        },
        children: [
          {
            path: '',
            component: AdminProductsComponent
          }
        ]
      },

      // CONFIG
      {
        path: 'config',
        component: AdminProductsComponent, // replace with AdminConfigComponent
        data: {
          title: 'Configuration',
          breadcrumb: 'Config / Settings',
          subnav: [
            { label: 'General', link: '/admin/config' }
          ]
        }
      }
    ]
  }
];
