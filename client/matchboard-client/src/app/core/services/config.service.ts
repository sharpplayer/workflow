import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";
import { HttpClient } from "@angular/common/http";
interface ConfigResponse {
    value: string[];
    type: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {

    private http = inject(HttpClient);

    async getList(config : string): Promise<ConfigResponse> {
        const res = await firstValueFrom(
            this.http.get<ConfigResponse>(`${API_BASE_URL}/api/config/${config}`)
        );
        return res;
    }
}