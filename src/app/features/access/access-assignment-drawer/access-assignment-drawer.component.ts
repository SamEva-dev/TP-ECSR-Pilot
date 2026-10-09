import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import type { AccessAccount } from "../../../core/access/access.models";
import type { MembershipRole, MembershipScope, WorkspaceMembership } from "../../../core/models/workspace.models";
import { WorkspaceContextService } from "../../../core/workspace/workspace-context.service";

@Component({ selector: "app-access-assignment-drawer", imports: [FormsModule, TranslatePipe], templateUrl: "./access-assignment-drawer.component.html", changeDetection: ChangeDetectionStrategy.OnPush })
export class AccessAssignmentDrawerComponent implements OnInit {
  private readonly workspace = inject(WorkspaceContextService);
  readonly account = input.required<AccessAccount>();
  readonly closed = output<void>();
  readonly assignmentAdded = output<WorkspaceMembership>();
  readonly assignmentRemoved = output<string>();

  get organizations() {
    const current = this.workspace.organization();
    return current ? [current] : [];
  }
  scope: MembershipScope = "program";
  organizationId = this.workspace.organization()?.id ?? "";
  siteId = this.workspace.site()?.id ?? "";
  programId = this.workspace.program()?.id ?? "";
  cohortId = this.workspace.cohort()?.id ?? "";
  examSessionId = "";
  readonly showCreate = signal(false);

  ngOnInit(): void {
    this.scope = this.defaultScope(this.account().role);
    this.initializeSelection();
  }

  scopeOptions(): readonly MembershipScope[] {
    const role = this.account().role;
    if (role === "organization_admin" || role === "organization_direction") return ["organization"];
    if (role === "site_direction") return ["site"];
    if (role === "student") return ["cohort"];
    if (role === "jury") return ["exam"];
    return ["organization", "site", "program", "cohort"];
  }

  private defaultScope(role: MembershipRole): MembershipScope {
    if (role === "organization_admin" || role === "organization_direction") return "organization";
    if (role === "site_direction") return "site";
    if (role === "student") return "cohort";
    if (role === "jury") return "exam";
    return "organization";
  }

  sites() { return this.workspace.sites(); }
  availablePrograms() { return this.siteId ? this.workspace.sitePrograms(this.siteId) : []; }
  cohorts() {
    if (!this.siteId) return [];
    const rows = this.workspace.siteCohorts(this.siteId);
    if (!this.programId) return rows;
    return rows.filter((c) => c.programId === this.programId);
  }
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
  onScopeChange(): void {
    this.initializeSelection();
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

  canAdd(): boolean {
    if (!this.organizationId) return false;
    if (this.scope === "organization") return true;
    if (this.scope === "site") return !!this.siteId;
    if (this.scope === "program") return !!this.siteId && !!this.programId;
    if (this.scope === "cohort") return !!this.siteId && !!this.programId && !!this.cohortId;
    if (this.scope === "exam") return !!this.siteId && !!this.programId && !!this.cohortId && !!this.examSessionId.trim();
    return false;
  }

  private initializeSelection(): void {
    this.organizationId = this.workspace.organization()?.id ?? this.organizations[0]?.id ?? "";

    if (this.scope === "organization") {
      this.siteId = "";
      this.programId = "";
      this.cohortId = "";
      this.examSessionId = "";
      return;
    }

    if (!this.siteId || !this.sites().some((x) => x.id === this.siteId))
      this.siteId = this.workspace.site()?.id ?? this.sites()[0]?.id ?? "";

    if (this.scope === "site") {
      this.programId = "";
      this.cohortId = "";
      this.examSessionId = "";
      return;
    }

    if (!this.programId || !this.availablePrograms().some((x) => x.id === this.programId))
      this.programId = this.workspace.program()?.id ?? this.availablePrograms()[0]?.id ?? "";

    if (this.scope === "program") {
      this.cohortId = "";
      this.examSessionId = "";
      return;
    }

    if (!this.cohortId || !this.cohorts().some((x) => x.id === this.cohortId))
      this.cohortId = this.workspace.cohort()?.id ?? this.cohorts()[0]?.id ?? "";

    if (this.scope !== "exam") this.examSessionId = "";
  }

  add(): void {
    if (!this.canAdd()) return;
    const membership: WorkspaceMembership = {
      id: "", userId: this.account()?.id ?? "", role: this.account().role, scope: this.scope, active: true,
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
