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

export interface MachineInput {
    id: number;
    name: string;
    setupTime: number;
}

interface MachineConfigResponse {
    value: MachineInput[];
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

    async getMachineList(): Promise<MachineInput[]> {
        const res = await firstValueFrom(
            this.http.get<MachineConfigResponse>(`${API_BASE_URL}/api/config/machine`)
        );
        return res.value;
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