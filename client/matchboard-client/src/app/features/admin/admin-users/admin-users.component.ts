import { CommonModule } from "@angular/common";
import { AdminUserComponent, UserForm } from "../admin-user/admin-user.component";
import { Component, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { User, UserService } from "../../../core/services/user.service";
import { ConfigItem, ConfigService } from "../../../core/services/config.service";
import { AdminUsersListComponent } from "../admin-users-list/admin-users-list.component";

@Component({
    selector: 'admin-users-page',
    standalone: true,
    imports: [CommonModule, AdminUsersListComponent, AdminUserComponent],
    template: `
     <div class="user-container">
        <admin-users-list 
            (edit)="selectUser($event)">
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
  `,
    styles: [`
        .backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 1000;
        }
    `]
})
export class AdminUsersComponent implements OnInit {
    private configService = inject(ConfigService);
    private userService = inject(UserService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    roles = signal<ConfigItem[]>([]);
    selectedUser = signal<UserForm | null>(null);
    showModal = signal(false);

    async ngOnInit(): Promise<void> {
        await this.loadRoles();

        if (this.route.snapshot.routeConfig?.path === 'users/new') {
            this.openCreate();
            return;
        }

        const username = this.route.snapshot.paramMap.get('username');
        if (username) {
            await this.openEditByUsername(username);
        }
    }

    async loadRoles() {
        try {
            const res = await this.configService.getList("roles");

            const roleValues = res.value
                .sort((a: ConfigItem, b: ConfigItem) => a.value.localeCompare(b.value));

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

    selectUser(user: User) {
        this.openEdit(user);
        void this.router.navigate(['/admin/users', user.username]);
    }

    private async openEditByUsername(username: string): Promise<void> {
        if (this.userService.users().length === 0) {
            await this.userService.loadUsers();
        }

        const user = this.userService.users().find(u => u.username === username);
        if (user) {
            this.openEdit(user);
            return;
        }

        void this.router.navigate(['/admin/users']);
    }
    
    closeModal() {
        this.showModal.set(false);
        this.selectedUser.set(null);

        if (this.route.snapshot.routeConfig?.path !== 'users') {
            void this.router.navigate(['/admin/users']);
        }
    }
}
