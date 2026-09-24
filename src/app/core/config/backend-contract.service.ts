import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";

export interface BackendContract {
  product: string;
  applicationCode: string;
  apiVersion: string;
  realtimeHubPath: string;
  demoEnabled: boolean;
  auth: { provider: "AuthGate"; clientId: string };
  invariants: {
    stronglyTypedIdentifiers: boolean;
    noTrackingReadsByDefault: boolean;
    idempotency: boolean;
    outbox: boolean;
    signalR: boolean;
  };
}

@Injectable({ providedIn: "root" })
export class BackendContractService {
  private readonly http = inject(HttpClient);
  load(): Promise<BackendContract> {
    return firstValueFrom(this.http.get<BackendContract>(`${environment.apiBaseUrl}/api/v1/system/contracts`));
  }
}
