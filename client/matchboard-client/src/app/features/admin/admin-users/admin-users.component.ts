import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUserListComponent } from '../admin-users-list/admin-users-list.component';
import { AdminUserComponent } from '../admin-user/admin-user.component';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'admin-users-page',
  standalone: true,
  imports: [CommonModule, AdminUserListComponent, AdminUserComponent],
  template: `
    <admin-users-list></admin-users-list>
    <admin-user [roles]="roles"></admin-user>
  `
})
export class AdminUsersComponent {
  private userService = inject(UserService);
  roles = this.userService.roles; 

  constructor() {
    this.userService.loadRoles();
  }
}