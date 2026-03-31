import { inject, Injectable, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { API_BASE_URL } from "../../app.config";
import { HttpClient } from "@angular/common/http";

export interface ConfigItem {
    key: string;
    value: string;
}


interface ConfigResponse {
    value: ConfigItem[];
    type: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {

    private http = inject(HttpClient);

    async getList(config: string): Promise<ConfigResponse> {
        const res = await firstValueFrom(
            this.http.get<ConfigResponse>(`${API_BASE_URL}/api/config/${config}`)
        );
        return res;
    }

    async addItem(configItem: string, body: any): Promise<ConfigItem> {
        const res = await firstValueFrom(
            this.http.post<ConfigItem>(
                `${API_BASE_URL}/api/config/${configItem.toLowerCase()}`,
                body,
                { withCredentials: true }
            )
        );

        return res;
    }
}