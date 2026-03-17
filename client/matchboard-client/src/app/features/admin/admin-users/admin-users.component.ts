import { CommonModule } from "@angular/common";
import { AdminUserListComponent } from "../admin-users-list/admin-users-list.component";
import { AdminUserComponent, UserForm } from "../admin-user/admin-user.component";
import { Component, inject, signal, ViewChild } from "@angular/core";
import { User, UserService } from "../../../core/services/user.service";

@Component({
    selector: 'admin-users-page',
    standalone: true,
    imports: [CommonModule, AdminUserListComponent, AdminUserComponent],
    template: `
    <admin-users-list 
      (edit)="onEditUser($event)">
    </admin-users-list>

    <admin-user 
      [roles]="roles" 
      [initialData]="selectedUser()">
    </admin-user>
  `
})
export class AdminUsersComponent {
    private userService = inject(UserService);

    roles = this.userService.roles;
    selectedUser = signal<UserForm | null>(null);

    @ViewChild(AdminUserComponent)
    userForm?: AdminUserComponent;

    constructor() {
        this.userService.loadRoles();
    }

    onEditUser(user: User) {
        const formData: UserForm = {
            username: user.username,
            password: '',
            roles: user.roles
        };
        this.selectedUser.set(formData);
    }

    isDirty(): boolean {
        return this.userForm?.isDirty() ?? false;
    }
}