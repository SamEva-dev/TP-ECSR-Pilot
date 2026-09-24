export type WorkspaceScope = "platform" | "organization" | "site" | "program" | "cohort";

export type ProgramModule =
  | "planning"
  | "attendance"
  | "sessions"
  | "driving"
  | "plateau"
  | "sheets"
  | "skills"
  | "internships"
  | "documents"
  | "assessments"
  | "certification"
  | "statistics"
  | "distanceLearning";

export interface Organization {
  id: string;
  /** Backend UUID; id stays the stable external key until BE-02/BE-03 complete the migration. */
  apiId?: string;
  code: string;
  name: string;
  shortName: string;
  city: string;
  active: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export interface TrainingSite {
  id: string;
  /** Backend UUID; id stays the stable external key during the progressive migration. */
  apiId?: string;
  organizationId: string;
  code: string;
  name: string;
  city: string;
  active: boolean;
}

export interface TrainingProgram {
  id: string;
  code: string;
  name: string;
  category: string;
  familyCode?: string;
  apiId?: string;
  icon: string;
  active: boolean;
  enabledModules: ProgramModule[];
}

export interface ProgramOffering {
  id: string;
  apiId?: string;
  siteId: string;
  programId: string;
  active: boolean;
}

export interface WorkspaceCohort {
  id: string;
  apiId?: string;
  offeringId: string;
  name: string;
  shortName: string;
  start: string;
  end: string;
  status: "planned" | "active" | "completed";
  studentCount: number;
  referentialVersionId?: string;
}

export interface WorkspaceSelection {
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
}

export interface WorkspaceAccessRule {
  scope: WorkspaceScope;
  organizationIds?: string[];
  siteIds?: string[];
  offeringIds?: string[];
  cohortIds?: string[];
  locked?: boolean;
}

/** UI-only role attached to a precise business perimeter. */
export type MembershipRole =
  | "platform_admin"
  | "organization_admin"
  | "organization_direction"
  | "site_direction"
  | "pedagogical_manager"
  | "secretariat"
  | "trainer"
  | "student"
  | "jury"
  | "read_only";

export type MembershipScope =
  | "platform"
  | "organization"
  | "site"
  | "program"
  | "cohort"
  | "exam";

export interface WorkspaceMembership {
  id: string;
  userId: string;
  role: MembershipRole;
  scope: MembershipScope;
  organizationId?: string;
  siteId?: string;
  programId?: string;
  cohortId?: string;
  examSessionId?: string;
  active: boolean;
}
