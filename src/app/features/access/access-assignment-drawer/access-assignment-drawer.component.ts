import { ChangeDetectionStrategy, Component, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { AccessAccount } from "../../../core/access/access.models";
import type { MembershipRole, MembershipScope, WorkspaceMembership } from "../../../core/models/workspace.models";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";

@Component({ selector: "app-access-assignment-drawer", imports: [FormsModule, TranslatePipe], templateUrl: "./access-assignment-drawer.component.html", changeDetection: ChangeDetectionStrategy.OnPush })
export class AccessAssignmentDrawerComponent {
  private readonly workspace = inject(WorkspaceContextService);
  readonly account = input.required<AccessAccount>();
  readonly closed = output<void>();
  readonly assignmentAdded = output<WorkspaceMembership>();
  readonly assignmentRemoved = output<string>();

  get organizations() { return this.workspace.organizations(); }
  role: MembershipRole = "trainer";
  scope: MembershipScope = "program";
  organizationId = this.workspace.organization()?.id ?? "";
  siteId = this.workspace.site()?.id ?? "";
  programId = this.workspace.program()?.id ?? "";
  cohortId = this.workspace.cohort()?.id ?? "";
  examSessionId = "";
  readonly showCreate = signal(false);

  sites() { return this.workspace.sites(); }
  availablePrograms() { return this.siteId ? this.workspace.sitePrograms(this.siteId) : []; }
  cohorts() { return this.siteId ? this.workspace.siteCohorts(this.siteId).filter((c) => !this.programId || c.programId === this.programId) : []; }
  roleKey(role: MembershipRole): string { return `access.assignments.roles.${role}`; }
  scopeKey(scope: MembershipScope): string { return `access.assignments.scopes.${scope}`; }
  organizationName(id?: string): string { return this.workspace.organizations().find((x) => x.id === id || x.apiId === id)?.shortName ?? ""; }
  siteName(id?: string): string { return this.workspace.sites().find((x) => x.id === id || x.apiId === id)?.name ?? ""; }
  programName(id?: string): string {
    if (!id) return "";
    for (const site of this.workspace.sites()) { const x = this.workspace.sitePrograms(site.id).find((p) => p.id === id || p.apiId === id); if (x) return x.name ?? ""; }
    return "";
  }
  cohortName(id?: string): string {
    if (!id) return "";
    for (const site of this.workspace.sites()) { const x = this.workspace.siteCohorts(site.id).find((c) => c.id === id || c.apiId === id); if (x) return x.shortName ?? x.name ?? ""; }
    return "";
  }
  onOrganizationChange(): void { this.siteId = this.sites()[0]?.id ?? ""; this.onSiteChange(); }
  onSiteChange(): void { this.programId = this.availablePrograms()[0]?.id ?? ""; this.onProgramChange(); }
  onProgramChange(): void { this.cohortId = this.cohorts()[0]?.id ?? ""; }
  add(): void {
    const membership: WorkspaceMembership = {
      id: "", userId: this.account()?.id ?? "", role: this.role, scope: this.scope, active: true,
      organizationId: this.scope === "platform" ? "" : this.organizationId,
      siteId: ["site", "program", "cohort", "exam"].includes(this.scope) ? this.siteId : "",
      programId: ["program", "cohort", "exam"].includes(this.scope) ? this.programId : "",
      cohortId: ["cohort", "exam"].includes(this.scope) ? this.cohortId : "",
      examSessionId: this.scope === "exam" ? this.examSessionId.trim() : "",
    };
    this.assignmentAdded.emit(membership);
    this.showCreate.set(false);
  }
}
