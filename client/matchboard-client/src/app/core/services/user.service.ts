import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../app.config';

export interface User {
  username: string;
  roles: string[];
  enabled: boolean;
}

interface UsersResponse {
  users: User[];
}

interface RolesResponse {
  value: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  // Signal for users
  users = signal<User[]>([]);
  // Signal for roles
  roles = signal<string[]>([]);

  // Load all users from API
  async loadUsers(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<UsersResponse>(`${API_BASE_URL}/api/users`, { withCredentials: true })
    );
    this.users.set(res.users);
  }

  // Load roles from API
  async loadRoles(): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<RolesResponse>(`${API_BASE_URL}/api/config/roles`)
    );
    this.roles.set(res.value ?? []);
  }

  // Create user and refresh users
  async createUser(user: Partial<User>): Promise<void> {
    await firstValueFrom(
      this.http.post(`${API_BASE_URL}/api/users`, user, { withCredentials: true })
    );
    await this.loadUsers();
  }
}