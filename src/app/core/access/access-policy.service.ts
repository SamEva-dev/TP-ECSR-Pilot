import { Injectable, computed, inject } from "@angular/core";
import { environment } from "../../environments/environment";
import type { AppPermission } from "./access.models";
import type {
  MembershipRole,
  WorkspaceMembership,
} from "../models/workspace.models";
import { SessionService } from "../session/session.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

const ALL_PERMISSIONS: AppPermission[] = [
  "home.view",
  "organization.dashboard",
  "organization.ownership.transfer",
  "organization.commercial.read",
  "organization.commercial.manage",
  "sites.view",
  "sites.delete",
  "programs.view",
  "programs.manage",
  "programs.delete",
  "referentials.view",
  "planning.view",
  "remoteWork.view",
  "distanceLearning.view",
  "students.view",
  "studentDetail.view",
  "promotions.view",
  "promotions.create",
  "promotions.delete",
  "sessions.view",
  "sessions.manage",
  "sessions.viewOthers",
  "sessions.assignTrainer",
  "driving.view",
  "driving.viewOthers",
  "driving.assignTrainer",
  "sheets.view",
  "skills.view",
  "attendance.view",
  "signatures.view",
  "internships.view",
  "documents.view",
  "certification.view",
  "certification.manage",
  "candidateCertification.view",
  "results.view",
  "success.view",
  "reports.view",
  "statistics.view",
  "access.manage",
  "access.privileged.manage",
  "administration.manage",
];

const ROLE_PERMISSIONS: Record<MembershipRole, readonly AppPermission[]> = {
  platform_admin: [...ALL_PERMISSIONS, "jury.view"],
  organization_admin: ALL_PERMISSIONS,
  organization_direction: ALL_PERMISSIONS.filter((permission) =>
    permission !== "access.privileged.manage"
    && permission !== "organization.ownership.transfer"
    && permission !== "organization.commercial.manage"),
  site_direction: [
    "home.view",
    "planning.view",
    "remoteWork.view",
    "distanceLearning.view",
    "students.view",
    "studentDetail.view",
    "promotions.view",
    "sessions.view",
    "sessions.manage",
    "driving.view",
    "sheets.view",
    "skills.view",
    "attendance.view",
  "signatures.view",
    "internships.view",
    "documents.view",
    "certification.view",
    "certification.manage",
    "candidateCertification.view",
    "results.view",
    "success.view",
    "reports.view",
    "statistics.view",
  ],
  pedagogical_manager: [
    "home.view",
    "planning.view",
    "remoteWork.view",
    "distanceLearning.view",
    "students.view",
    "studentDetail.view",
    "promotions.view",
    "sessions.view",
    "sessions.manage",
    "driving.view",
    "sheets.view",
    "skills.view",
    "attendance.view",
  "signatures.view",
    "internships.view",
    "documents.view",
    "certification.view",
    "certification.manage",
    "candidateCertification.view",
    "results.view",
    "success.view",
    "reports.view",
    "statistics.view",
  ],
  secretariat: [
    "home.view",
    "planning.view",
    "remoteWork.view",
    "distanceLearning.view",
    "students.view",
    "studentDetail.view",
    "promotions.view",
    "sessions.view",
    "attendance.view",
  "signatures.view",
    "internships.view",
    "documents.view",
    "certification.view",
    "certification.manage",
    "candidateCertification.view",
    "results.view",
    "success.view",
    "reports.view",
  ],
  trainer: [
    "home.view",
    "planning.view",
    "remoteWork.view",
    "distanceLearning.view",
    "students.view",
    "studentDetail.view",
    "sessions.view",
    "sessions.manage",
    "driving.view",
    "sheets.view",
    "skills.view",
    "attendance.view",
  "signatures.view",
    "internships.view",
    "documents.view",
    "certification.view",
    "candidateCertification.view",
  ],
  student: [
    "home.view",
    "planning.view",
    "distanceLearning.view",
    "studentDetail.view",
    "sessions.view",
    "attendance.view",
  "signatures.view",
    "driving.view",
    "sheets.view",
    "skills.view",
    "internships.view",
    "documents.view",
    "certification.view",
    "candidateCertification.view",
  ],
  jury: ["candidateCertification.view", "jury.view"],
  read_only: [
    "home.view",
    "planning.view",
    "distanceLearning.view",
    "students.view",
    "studentDetail.view",
    "promotions.view",
    "sessions.view",
    "sessions.manage",
    "driving.view",
    "sheets.view",
    "skills.view",
    "attendance.view",
  "signatures.view",
    "internships.view",
    "documents.view",
    "certification.view",
    "candidateCertification.view",
    "results.view",
    "success.view",
    "reports.view",
    "statistics.view",
  ],
};

@Injectable({ providedIn: "root" })
export class AccessPolicyService {
  private readonly sessionService = inject(SessionService);
  private readonly workspace = inject(WorkspaceContextService);

  readonly memberships = computed<WorkspaceMembership[]>(() => []);

  readonly effectiveMemberships = computed(() => [] as WorkspaceMembership[]);

  readonly effectiveRoles = computed<MembershipRole[]>(() => {
    const roles = this.sessionService.session()?.roles ?? [];
    const normalized = roles.map((x) => x.toLowerCase());
    const mapped: MembershipRole[] = [];
    const push = (r: MembershipRole) => {
      if (!mapped.includes(r)) mapped.push(r);
    };
    for (const role of normalized) {
      if (role.includes("platformadministrator") || role.includes("superadmin"))
        push("platform_admin");
      else if (role.includes("organizationadministrator"))
        push("organization_admin");
      else if (role.includes("organizationdirection"))
        push("organization_direction");
      else if (role.includes("sitedirection")) push("site_direction");
      else if (role.includes("pedagogicalmanager")) push("pedagogical_manager");
      else if (role.includes("secretariat")) push("secretariat");
      else if (role.includes("trainer")) push("trainer");
      else if (role.includes("student")) push("student");
      else if (role.includes("jury")) push("jury");
      else if (role.includes("readonly")) push("read_only");
    }
    return mapped;
  });

  readonly isReadOnly = computed(
    () =>
      this.effectiveRoles().length > 0 &&
      this.effectiveRoles().every((role) => role === "read_only"),
  );

  can(permission: AppPermission): boolean {
    const session = this.sessionService.session();
    if (!session) return false;
    const permissions = new Set(session.permissions ?? []);
    const platform = (session.roles ?? []).some((role) =>
      /superadmin|platformadministrator/i.test(role),
    );
    // Only legacy sessions retain their historical role shortcut. In OIDC mode
    // every UI permission must be present in the API-resolved grant set.
    if (platform && environment.authMode !== 'oidc') return true;
    // An existing staff account may act as an explicitly assigned tutor without
    // changing its AuthGate role. The API still enforces active membership + period
    // assignment for every request; this only makes the workspace navigable.
    if (permission === "internships.tutor.viewAssigned" &&
        this.hasAnyRole("trainer", "pedagogical_manager") &&
        this.can("internships.view")) return true;
    // Transitional mapping: UI permissions map to server permission suffixes until front permission codes are renamed.
    const aliases: Record<string, string[]> = {
      "home.view": [],
      "organization.dashboard": ["pedagora.statistics.view", "pedagora.organization.manage"],
      "organization.ownership.transfer": ["pedagora.organization.ownership.transfer", "organization.ownership.transfer"],
      "organization.commercial.read": ["pedagora.organization.commercial.read", "organization.commercial.read"],
      "organization.commercial.manage": ["pedagora.organization.commercial.manage", "organization.commercial.manage"],
      "sites.view": ["pedagora.sites.view", "sites.view"],
      "sites.delete": ["pedagora.sites.delete", "sites.delete"],
      "programs.view": ["pedagora.programs.view", "programs.view"],
      "programs.manage": ["pedagora.programs.manage", "programs.manage"],
      "programs.delete": ["pedagora.programs.delete", "programs.delete"],
      "referentials.view": ["pedagora.referentials.view", "referentials.view"],
      "planning.view": ["pedagora.sessions.view", "sessions.view"],
      "remoteWork.view": ["pedagora.remote-work.view", "remote-work.view"],
      "distanceLearning.view": ["pedagora.distance-learning.view", "distance-learning.view"],
      "promotions.view": ["pedagora.cohorts.view", "cohorts.view"],
      "promotions.create": ["pedagora.cohorts.create", "cohorts.create", "pedagora.promotions.create", "promotions.create"],
      "promotions.delete": ["pedagora.promotions.delete", "promotions.delete", "pedagora.cohorts.delete", "cohorts.delete"],
      "students.view": ["pedagora.learners.view", "learners.view"],
      "studentDetail.view": ["pedagora.learners.detail.view", "learners.detail.view"],
      "sessions.view": ["pedagora.sessions.view", "sessions.view"],
      "sessions.manage": ["pedagora.sessions.manage", "sessions.manage"],
      "sessions.viewOthers": ["pedagora.sessions.viewOthers", "sessions.viewOthers"],
      "sessions.assignTrainer": ["pedagora.sessions.assignTrainer", "sessions.assignTrainer"],
      "driving.view": ["pedagora.driving.view", "driving.view"],
      "driving.viewOthers": ["pedagora.driving.viewOthers", "driving.viewOthers"],
      "driving.assignTrainer": ["pedagora.driving.assignTrainer", "driving.assignTrainer"],
      "sheets.view": ["pedagora.sheets.view", "sheets.view"],
      "skills.view": ["pedagora.skills.view", "skills.view"],
      "attendance.view": ["pedagora.attendance.view", "attendance.view"],
      "signatures.view": ["pedagora.signatures.view", "signatures.view"],
      "internships.view": ["pedagora.internships.view", "internships.view"],
      "internships.tutor.viewAssigned": ["pedagora.internships.tutor.viewAssigned", "internships.tutor.viewAssigned"],
      "documents.view": ["pedagora.documents.view", "documents.view"],
      "certification.view": ["pedagora.certification.view", "certification.view"],
      "certification.manage": ["pedagora.certification.manage", "certification.manage"],
      "candidateCertification.view": ["pedagora.certification.view", "certification.view"],
      "jury.view": ["pedagora.jury.evaluate", "jury.evaluate"],
      "results.view": ["pedagora.results.view", "results.view"],
      "success.view": ["pedagora.results.view", "pedagora.certification.view", "results.view", "certification.view"],
      "reports.view": ["pedagora.reports.export", "pedagora.statistics.view", "reports.export"],
      "statistics.view": ["pedagora.statistics.view", "statistics.view"],
      "access.manage": ["pedagora.access.manage", "access.manage"],
      "access.privileged.manage": ["pedagora.access.privileged.manage", "access.privileged.manage"],
      "administration.manage": ["pedagora.organization.manage", "organization.manage"],
    };
    if (permission === "home.view" && session.authMode === "authgate" &&
        environment.authMode !== 'oidc') return permissions.size > 0;
    const candidates = [permission, ...(aliases[permission] ?? [])];
    if (candidates.some((candidate) => permissions.has(candidate))) return true;
    // AuthGate permissions are authoritative. Keep role defaults only for the legacy non-AuthGate demo path.
    if (session.authMode === "authgate") return false;
    return this.effectiveRoles().some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
  }

  hasAnyRole(...roles: MembershipRole[]): boolean {
    if (!roles.length) return true;
    const effective = new Set(this.effectiveRoles());
    return roles.some((role) => effective.has(role));
  }

  /** The direction workspace supervises internships via /stages, not tutor-only endpoints. */
  canOpenTutorWorkspace(): boolean {
    if (this.hasAnyRole("organization_admin", "organization_direction", "site_direction", "platform_admin")) {
      return false;
    }
    return this.can("internships.tutor.viewAssigned");
  }

  defaultPath(): string {
    if (this.canOpenTutorWorkspace() && !this.can("home.view")) return "/mes-stages-tuteur";
    if (this.hasAnyRole("jury") && this.can("jury.view") && !this.can("home.view")) return "/jury";
    if (this.can("home.view")) return "/accueil";
    if (this.hasAnyRole("jury") && this.can("jury.view")) return "/jury";
    if (this.can("planning.view")) return "/planning";
    if (this.can("documents.view")) return "/documents";
    return "/connexion";
  }

  private matchesSelection(
    assignment: WorkspaceMembership,
    selection: {
      organizationId: string;
      siteId: string;
      programId: string;
      cohortId: string;
    },
  ): boolean {
    if (assignment.scope === "platform") return true;
    if (
      assignment.organizationId &&
      assignment.organizationId !== selection.organizationId
    ) {
      return false;
    }
    if (assignment.scope === "organization") return true;

    if (assignment.siteId && assignment.siteId !== selection.siteId)
      return false;
    if (assignment.scope === "site") return true;

    if (assignment.programId && assignment.programId !== selection.programId) {
      return false;
    }
    if (assignment.scope === "program") return true;

    if (assignment.cohortId && assignment.cohortId !== selection.cohortId) {
      return false;
    }
    return assignment.scope === "cohort" || assignment.scope === "exam";
  }
}
