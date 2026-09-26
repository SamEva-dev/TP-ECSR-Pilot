import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type {
  CreateRemoteWorkRequestApi,
  RemoteWorkPolicyApi,
  RemoteWorkRequestApi,
} from "./workforce.models";

@Injectable({ providedIn: "root" })
export class WorkforceApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/workforce/remote-work`;

  policy(): Promise<RemoteWorkPolicyApi> {
    return firstValueFrom(
      this.http.get<RemoteWorkPolicyApi>(`${this.base}/policy`),
    );
  }

  list(siteId?: string, mineOnly = false): Promise<RemoteWorkRequestApi[]> {
    let params = new HttpParams().set("mineOnly", mineOnly);
    if (siteId) params = params.set("siteId", siteId);
    return firstValueFrom(
      this.http.get<RemoteWorkRequestApi[]>(this.base, { params }),
    );
  }

  create(payload: CreateRemoteWorkRequestApi): Promise<RemoteWorkRequestApi> {
    return firstValueFrom(
      this.http.post<RemoteWorkRequestApi>(this.base, payload),
    );
  }

  decide(id: string, approved: boolean): Promise<RemoteWorkRequestApi> {
    return firstValueFrom(
      this.http.put<RemoteWorkRequestApi>(`${this.base}/${id}/decision`, {
        approved,
      }),
    );
  }

  updateActivity(
    requestId: string,
    activityId: string,
    status: string,
  ): Promise<RemoteWorkRequestApi> {
    return firstValueFrom(
      this.http.put<RemoteWorkRequestApi>(
        `${this.base}/${requestId}/activities/${activityId}`,
        { status },
      ),
    );
  }
}
