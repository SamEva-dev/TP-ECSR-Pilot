import { Injectable, effect, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import { AccessPolicyService } from "./access-policy.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

@Injectable({ providedIn: "root" })
export class StatisticsModuleAvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly access = inject(AccessPolicyService);
  private readonly allowedOrganization = signal("");
  readonly available = this.allowedOrganization.asReadonly();
  private sequence = 0;

  constructor() {
    effect(() => {
      const id = this.workspace.organization()?.apiId ?? "";
      void this.refresh(id);
    });
  }

  async check(organizationId = this.workspace.organization()?.apiId ?? ""): Promise<boolean> {
    if (!organizationId || this.workspace.organization()?.apiId !== organizationId || !this.access.can("statistics.view")) return false;
    try {
      const status = await firstValueFrom(this.http.get<{ enabled: boolean }>(
        `${environment.apiBaseUrl}/api/v1/reporting/organizations/${encodeURIComponent(organizationId)}/modules/statistics/status`,
      ));
      return this.workspace.organization()?.apiId === organizationId && status?.enabled === true;
    } catch {
      return false; // An unavailable API is not a reason to grant access.
    }
  }

  async refresh(organizationId = this.workspace.organization()?.apiId ?? ""): Promise<void> {
    const seq = ++this.sequence;
    this.allowedOrganization.set("");
    const allowed = await this.check(organizationId);
    if (seq === this.sequence && this.workspace.organization()?.apiId === organizationId)
      this.allowedOrganization.set(allowed ? organizationId : "");
  }

  isEnabledForCurrentOrganization(): boolean {
    const id = this.workspace.organization()?.apiId ?? "";
    return !!id && this.allowedOrganization() === id;
  }
}
