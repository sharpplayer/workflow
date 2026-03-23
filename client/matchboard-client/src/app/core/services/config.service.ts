import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";
import { HttpClient } from "@angular/common/http";
interface ConfigResponse {
    value: string[];
}

@Injectable({ providedIn: 'root' })
export class ConfigService {

    private http = inject(HttpClient);

    roles = signal<string[]>([]);

    async loadRoles(): Promise<void> {
        const res = await firstValueFrom(
            this.http.get<ConfigResponse>(`${API_BASE_URL}/api/config/roles`)
        );
        this.roles.set(res.value ?? []);
    }
}