export type AppPermission =
  | "home.view"
  | "organization.dashboard"
  | "organization.ownership.transfer"
  | "organization.commercial.read"
  | "organization.commercial.manage"
  | "sites.view"
  | "programs.view"
  | "referentials.view"
  | "planning.view"
  | "remoteWork.view"
  | "distanceLearning.view"
  | "students.view"
  | "studentDetail.view"
  | "promotions.view"
  | "sessions.view"
  | "driving.view"
  | "sheets.view"
  | "skills.view"
  | "attendance.view"
  | "internships.view"
  | "documents.view"
  | "certification.view"
  | "certification.manage"
  | "candidateCertification.view"
  | "jury.view"
  | "results.view"
  | "success.view"
  | "reports.view"
  | "statistics.view"
  | "access.manage"
  | "access.privileged.manage"
  | "administration.manage";

import type {
  MembershipRole,
  WorkspaceMembership,
} from "../models/workspace.models";

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
  role: MembershipRole;
  access: AccessState;
  permissions: AccessPermission[];
  assignments: WorkspaceMembership[];
  isInvitation?: boolean;
}
