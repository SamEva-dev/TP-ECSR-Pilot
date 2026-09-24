// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { DemoSession, UserRole } from "./app.models";
import type { WorkspaceMembership } from "./workspace.models";

export type AccessState = "active" | "invited" | "suspended";

export type AccessPermissionKey =
  | "students"
  | "sessions"
  | "evaluations"
  | "documents"
  | "certification"
  | "reports"
  | "administration";

export interface AccessPermission {
  key: AccessPermissionKey;
  enabled: boolean;
}

export interface AccessAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Legacy/demo primary role. Effective access now comes from assignments. */
  role: UserRole;
  access: AccessState;
  detailKey?: string;
  permissions: AccessPermission[];
  assignments: WorkspaceMembership[];
}
