import { CommonModule } from "@angular/common";
import { AdminUserComponent, UserForm } from "../admin-user/admin-user.component";
import { Component, inject, signal } from "@angular/core";
import { User } from "../../../core/services/user.service";
import { ConfigService } from "../../../core/services/config.service";
import { AdminUsersListComponent } from "../admin-users-list/admin-users-list.component";

@Component({
    selector: 'admin-users-page',
    standalone: true,
    imports: [CommonModule, AdminUsersListComponent, AdminUserComponent],
    template: `
     <div class="user-container">

        <admin-users-list 
            (edit)="openEdit($event)"
            (create)="openCreate()">
        </admin-users-list>

        <div class="backdrop" *ngIf="showModal()" (click)="closeModal()"></div>

        @if(showModal()){
            <admin-user
                [roles]="roles()"
                [initialData]="selectedUser()"
                (saved)="closeModal()"
                (cancelled)="closeModal()">
            </admin-user>
        }
    </div>
  `
})
export class AdminUsersComponent {
    private configService = inject(ConfigService);

    roles = signal<string[]>([]);
    selectedUser = signal<UserForm | null>(null);
    showModal = signal(false);

    constructor() {
        this.loadRoles();
    }

    async loadRoles() {
        try {
            const res = await this.configService.getList("roles");

            const roleValues = res.value
                .map((r: any) => r.value)
                .sort((a: string, b: string) => a.localeCompare(b));

            this.roles.set(roleValues);
        } catch (err) {
            console.error(err);
        }
    }

    openCreate() {
        this.selectedUser.set(null);
        this.showModal.set(true);
    }

    openEdit(user: User) {
        this.selectedUser.set({
            username: user.username,
            password: '',
            roles: [...user.roles].sort((a, b) => a.localeCompare(b)),
            resetPin: false,
            enabled: user.enabled
        });

        this.showModal.set(true);
    }
    
    closeModal() {
        this.showModal.set(false);
        this.selectedUser.set(null);
    }
}