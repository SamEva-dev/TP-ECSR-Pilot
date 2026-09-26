import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
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
export interface InviteProductAccountRequest { firstName: string; lastName: string; email: string; role: string; }
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
  private readonly url = `${environment.authGateBaseUrl}/api/pedagora/access`;

  list(page = 1, search = "", pageSize = 100) {
    return this.http.get<ProductAccountPage>(this.url, {
      params: new HttpParams().set("page", page).set("pageSize", pageSize).set("search", search ?? ""),
    });
  }
  invite(request: InviteProductAccountRequest) { return this.http.post<ProductAccount>(`${this.url}/invite`, request); }
  revokeInvitation(invitationId: string) { return this.http.delete<void>(`${this.url}/invitations/${encodeURIComponent(invitationId)}`); }
  setRole(userId: string, role: string) { return this.http.put<void>(`${this.url}/${encodeURIComponent(userId)}/roles`, { roles: [role] }); }
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
