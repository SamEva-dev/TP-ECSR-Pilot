import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";
import type { AccessPermissionKey } from "./access.models";
import type { MembershipRole, MembershipScope, WorkspaceMembership } from "../models/workspace.models";

export interface ProductPermission { key: AccessPermissionKey; enabled: boolean; }
export interface ProductAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "Active" | "Suspended" | "Invited";
  /** Canonical role for this PedagoraPilot application membership. */
  primaryRole?: string;
  roles: string[];
  permissions: ProductPermission[];
  assignments: WorkspaceMembership[];
  isInvitation: boolean;
}
export interface ProductAccountPage {
  items: ProductAccount[];
  totalCount: number;
  page: number;
  pageSize: number;
  rolesAvailable: string[];
}
export interface InviteProductAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: MembershipRole;
  siteId?: string | null;
  programId?: string | null;
  cohortId?: string | null;
  examSessionId?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  enrolledOn?: string | null;
}
export interface AddScopeAssignmentRequest {
  role: MembershipRole;
  scope: MembershipScope;
  siteId?: string | null;
  programId?: string | null;
  cohortId?: string | null;
  examSessionId?: string | null;
}

@Injectable({ providedIn: "root" })
export class PedagoraAccessApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/access`;

  list(page = 1, search = "", pageSize = 100) {
    return this.http.get<ProductAccountPage>(this.url, {
      params: new HttpParams().set("page", page).set("pageSize", pageSize).set("search", search ?? ""),
    });
  }

  trainers() { return this.http.get<ProductAccount[]>(`${this.url}/trainers`); }

  /** Active, accepted organization members with the exact product role; never invitations. */
  async membersWithRole(role: "pedagogical_manager" | "site_direction"): Promise<ProductAccount[]> {
    const matches: ProductAccount[] = [];
    let page = 1;
    const pageSize = 100;
    while (true) {
      const response = await firstValueFrom(this.list(page, "", pageSize));
      const items = Array.isArray(response?.items) ? response.items : [];
      for (const account of items) {
        const roles = [account.primaryRole, ...(account.roles ?? [])]
          .filter((value): value is string => typeof value === "string")
          .map(value => value.toLowerCase().replace(/[^a-z]/g, ""));
        const expected = role === "pedagogical_manager" ? "pedagogicalmanager" : "sitedirection";
        if (account.status === "Active" && !account.isInvitation && roles.some(value => value === expected || value === `pedagorapilot${expected}`))
          matches.push(account);
      }
      if (!items.length || page * pageSize >= (response?.totalCount ?? 0)) break;
      page++;
    }
    return [...new Map(matches.map(item => [item.id, item])).values()];
  }

  invite(request: InviteProductAccountRequest) { return this.http.post<ProductAccount>(`${this.url}/invite`, request); }
  revokeInvitation(invitationId: string) { return this.http.delete<void>(`${this.url}/invitations/${encodeURIComponent(invitationId)}`); }
  setRole(userId: string, role: MembershipRole) { return this.http.put<void>(`${this.url}/${encodeURIComponent(userId)}/roles`, { roles: [role] }); }
  transferOwnership(newOwnerUserId: string) {
    return this.http.post<{ ownerUserId: string; previousOwnerUserId: string }>(`${this.url}/ownership/transfer`, { newOwnerUserId });
  }
  setActive(userId: string, active: boolean) { return this.http.put<void>(`${this.url}/${encodeURIComponent(userId)}/status`, { active }); }
  revoke(userId: string) { return this.http.delete<void>(`${this.url}/${encodeURIComponent(userId)}`); }
  setPermission(userId: string, key: AccessPermissionKey, enabled: boolean) {
    return this.http.put<void>(`${this.url}/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(key)}`, { key, enabled });
  }
  addAssignment(userId: string, request: AddScopeAssignmentRequest) {
    return this.http.post<WorkspaceMembership>(`${this.url}/${encodeURIComponent(userId)}/assignments`, request);
  }
  removeAssignment(userId: string, assignmentId: string) {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(userId)}/assignments/${encodeURIComponent(assignmentId)}`);
  }
}
