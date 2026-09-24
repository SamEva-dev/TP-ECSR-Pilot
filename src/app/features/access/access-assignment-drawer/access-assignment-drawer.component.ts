import { ChangeDetectionStrategy, Component, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { AccessAccount } from "../../../core/models/access.models";
import { ORGANIZATIONS, PROGRAM_OFFERINGS, TRAINING_PROGRAMS, TRAINING_SITES, WORKSPACE_COHORTS } from "../../../core/api-data/runtime-data.store";
import type { MembershipRole, MembershipScope, WorkspaceMembership } from "../../../core/models/workspace.models";

@Component({
  selector: "app-access-assignment-drawer",
  imports: [FormsModule, TranslatePipe],
  templateUrl: "./access-assignment-drawer.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessAssignmentDrawerComponent {
  readonly account = input.required<AccessAccount>();
  readonly closed = output<void>();
  readonly assignmentAdded = output<WorkspaceMembership>();
  readonly assignmentRemoved = output<string>();

  readonly organizations = ORGANIZATIONS;
  readonly programs = TRAINING_PROGRAMS;

  role: MembershipRole = "trainer";
  scope: MembershipScope = "program";
  organizationId = ORGANIZATIONS[0]?.id ?? "";
  siteId = TRAINING_SITES[0]?.id ?? "";
  programId = TRAINING_PROGRAMS[0]?.id ?? "";
  cohortId = WORKSPACE_COHORTS[0]?.id ?? "";
  examSessionId = "";
  readonly showCreate = signal(false);

  sites() {
    return TRAINING_SITES.filter((site) => site.organizationId === this.organizationId);
  }

  availablePrograms() {
    const offeringProgramIds = PROGRAM_OFFERINGS
      .filter((offering) => offering.siteId === this.siteId && offering.active)
      .map((offering) => offering.programId);
    return TRAINING_PROGRAMS.filter((program) => offeringProgramIds.includes(program.id));
  }

  cohorts() {
    const offeringIds = PROGRAM_OFFERINGS
      .filter((offering) => offering.siteId === this.siteId && offering.programId === this.programId)
      .map((offering) => offering.id);
    return WORKSPACE_COHORTS.filter((cohort) => offeringIds.includes(cohort.offeringId));
  }

  roleKey(role: MembershipRole): string {
    return `access.assignments.roles.${role}`;
  }

  scopeKey(scope: MembershipScope): string {
    return `access.assignments.scopes.${scope}`;
  }

  organizationName(id?: string): string {
    return ORGANIZATIONS.find((item) => item.id === id)?.shortName ?? "—";
  }

  siteName(id?: string): string {
    return TRAINING_SITES.find((item) => item.id === id)?.name ?? "—";
  }

  programName(id?: string): string {
    return TRAINING_PROGRAMS.find((item) => item.id === id)?.name ?? "—";
  }

  cohortName(id?: string): string {
    return WORKSPACE_COHORTS.find((item) => item.id === id)?.shortName ?? "—";
  }

  onOrganizationChange(): void {
    this.siteId = this.sites()[0]?.id ?? "";
    this.onSiteChange();
  }

  onSiteChange(): void {
    this.programId = this.availablePrograms()[0]?.id ?? "";
    this.onProgramChange();
  }

  onProgramChange(): void {
    this.cohortId = this.cohorts()[0]?.id ?? "";
  }

  add(): void {
    const membership: WorkspaceMembership = {
      id: `${this.account().id}-assignment-${Date.now()}`,
      userId: this.account().id,
      role: this.role,
      scope: this.scope,
      active: true,
      organizationId: this.scope === "platform" ? undefined : this.organizationId,
      siteId: ["site", "program", "cohort", "exam"].includes(this.scope) ? this.siteId : undefined,
      programId: ["program", "cohort", "exam"].includes(this.scope) ? this.programId : undefined,
      cohortId: ["cohort", "exam"].includes(this.scope) ? this.cohortId : undefined,
      examSessionId: this.scope === "exam" ? this.examSessionId : undefined,
    };
    this.assignmentAdded.emit(membership);
    this.showCreate.set(false);
  }
}
