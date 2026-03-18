import { CommonModule } from "@angular/common";
import { AdminUserListComponent } from "../admin-users-list/admin-users-list.component";
import { AdminUserComponent, UserForm } from "../admin-user/admin-user.component";
import { Component, inject, signal } from "@angular/core";
import { User, UserService } from "../../../core/services/user.service";

@Component({
    selector: 'admin-users-page',
    standalone: true,
    imports: [CommonModule, AdminUserListComponent, AdminUserComponent],
    template: `
     <div class="user-container">

        <admin-users-list 
            (edit)="openEdit($event)"
            (create)="openCreate()">
        </admin-users-list>

        <div class="backdrop" *ngIf="showModal()" (click)="closeModal()"></div>

        <admin-user
            *ngIf="showModal()"
            [roles]="roles"
            [initialData]="selectedUser()"
            (saved)="closeModal()"
            (cancelled)="closeModal()">
        </admin-user>

    </div>
  `
})
export class AdminUsersComponent {
    private userService = inject(UserService);

    roles = this.userService.roles;
    selectedUser = signal<UserForm | null>(null);
    showModal = signal(false);

    constructor() {
        this.userService.loadRoles();
    }

    openCreate() {
        this.selectedUser.set(null);
        this.showModal.set(true);
    }

    openEdit(user: User) {
        this.selectedUser.set({
            username: user.username,
            password: '',
            roles: user.roles
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.selectedUser.set(null);
    }
}