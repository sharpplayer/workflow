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
        @if (mode() === 'list') {
          <admin-users-list
            (edit)="selectUser($event)">
          </admin-users-list>
        } @else {
          <admin-user
            [roles]="roles()"
            [initialData]="selectedUser()"
            (saved)="returnToList()"
            (cancelled)="returnToList()">
          </admin-user>
        }
    </div>
  `,
    styles: [`
        .user-container {
            max-width: 960px;
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
    mode = signal<'list' | 'new' | 'edit'>('list');

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
        this.mode.set('new');
    }

    openEdit(user: User) {
        this.selectedUser.set({
            username: user.username,
            password: '',
            roles: [...user.roles].sort((a, b) => a.localeCompare(b)),
            resetPin: false,
            enabled: user.enabled
        });

        this.mode.set('edit');
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
    
    returnToList() {
        this.selectedUser.set(null);
        this.mode.set('list');
        void this.router.navigate(['/admin/users']);
    }
}
