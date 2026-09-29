import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { AccessAccount, AccessPermissionKey } from "../../core/access/access.models";
import { PedagoraAccessApiService, type ProductAccount } from "../../core/access/pedagora-access-api.service";
import { AccessPolicyService } from "../../core/access/access-policy.service";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
import { RealtimeService } from "../../core/realtime/realtime.service";
import type { MembershipRole, WorkspaceMembership } from "../../core/models/workspace.models";
import { WorkspaceContextService } from "../../core/workspace/workspace-context.service";
import { AccessAssignmentDrawerComponent } from "./access-assignment-drawer/access-assignment-drawer.component";

@Component({
  selector: "app-access",
  imports: [FormsModule, TranslatePipe, AccessAssignmentDrawerComponent],
  templateUrl: "./access.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessComponent {
  private readonly api = inject(PedagoraAccessApiService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly accessPolicy = inject(AccessPolicyService);
  private readonly realtime = inject(RealtimeService);
  readonly workspace = inject(WorkspaceContextService);

  readonly accounts = signal<AccessAccount[]>([]);
  readonly search = signal("");
  readonly roleFilter = signal<"all" | MembershipRole>("all");
  readonly selectedId = signal("");
  readonly assignmentDrawerOpen = signal(false);
  private loadSequence = 0;

  inviteFirstName = "";
  inviteLastName = "";
  inviteEmail = "";
  inviteRole: MembershipRole = "trainer";

  readonly stats = computed(() => {
    const values = this.accounts();
    return {
      total: values.length,
      active: values.filter((item) => item.access === "active").length,
      assignments: values.reduce((sum, item) => sum + (item.assignments?.length ?? 0), 0),
      multiScope: values.filter((item) => (item.assignments?.length ?? 0) > 1).length,
    };
  });

  readonly filteredAccounts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase("fr-FR");
    const role = this.roleFilter();
    return this.accounts().filter((account) => {
      const matchesRole = role === "all" || account.role === role;
      const assignmentText = (account.assignments ?? [])
        .map((assignment) => `${this.organizationName(assignment.organizationId)} ${this.siteName(assignment.siteId)} ${this.programName(assignment.programId)}`)
        .join(" ");
      const haystack = `${account.firstName ?? ""} ${account.lastName ?? ""} ${account.email ?? ""} ${assignmentText}`.toLocaleLowerCase("fr-FR");
      return matchesRole && (!query || haystack.includes(query));
    });
  });

  readonly selectedAccount = computed(() =>
    this.accounts().find((item) => item.id === this.selectedId()) ?? this.accounts()[0] ?? null,
  );

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const organizationApiId = this.workspace.organization()?.apiId ?? "";
      if (!organizationApiId) {
        this.accounts.set([]);
        this.selectedId.set("");
        return;
      }
      untracked(() => void this.reload());
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event) return;
      if (event.typeKey === "pedagora.access.invitation.created.v1"
        || event.typeKey === "pedagora.access.invitation.accepted.v1"
        || event.typeKey === "pedagora.access.member.role-changed.v1") {
        untracked(() => void this.reload(false));
      }
    });
  }

  initials(account: AccessAccount): string {
    return `${account.firstName?.[0] ?? ""}${account.lastName?.[0] ?? ""}`.toUpperCase();
  }
  roleKey(role: MembershipRole): string { return `access.roles.${role}`; }
  stateKey(account: AccessAccount): string { return `access.states.${account.access}`; }

  organizationName(id?: string): string {
    if (!id) return "";
    return this.workspace.organizations().find((item) => item.id === id || item.apiId === id)?.shortName ?? "";
  }
  siteName(id?: string): string {
    if (!id) return "";
    return this.workspace.sites().find((item) => item.id === id || item.apiId === id)?.city ?? "";
  }
  programName(id?: string): string {
    if (!id) return "";
    for (const site of this.workspace.sites()) {
      const program = this.workspace.sitePrograms(site.id).find((item) => item.id === id || item.apiId === id);
      if (program) return program.name ?? "";
    }
    return "";
  }

  assignmentSummary(account: AccessAccount): string {
    if (!(account.assignments?.length ?? 0)) return "";
    const first = account.assignments[0];
    return [this.organizationName(first.organizationId), this.siteName(first.siteId), this.programName(first.programId)]
      .filter((part) => !!part).join(" · ");
  }

  select(account: AccessAccount): void { this.selectedId.set(account.id); }
  setSearch(value: string): void { this.search.set(value ?? ""); }
  setRoleFilter(value: string): void { this.roleFilter.set((value || "all") as "all" | MembershipRole); }

  readonly roleOptions: readonly MembershipRole[] = [
    "organization_admin",
    "organization_direction",
    "site_direction",
    "pedagogical_manager",
    "secretariat",
    "trainer",
    "student",
    "jury",
    "read_only",
  ];

  canAssignRole(role: MembershipRole): boolean {
    return role !== "organization_admin" || this.accessPolicy.can("access.privileged.manage");
  }

  canManageAccount(account: AccessAccount): boolean {
    return account.role !== "organization_admin" || this.accessPolicy.can("access.privileged.manage");
  }

  async changeRole(account: AccessAccount, role: string): Promise<void> {
    if (account.isInvitation) { this.notifications.error("access.api.pendingActionError", "/acces"); return; }
    if (!this.canManageAccount(account)) return;
    const nextRole = role as MembershipRole;
    if (!this.roleOptions.includes(nextRole) || !this.canAssignRole(nextRole) || nextRole === account.role) return;
    try {
      await firstValueFrom(this.api.setRole(account.id, nextRole));
      await this.reload(false);
    } catch { this.notifications.error("access.api.roleError", "/acces"); }
  }

  async toggleAccess(account: AccessAccount): Promise<void> {
    if (!this.canManageAccount(account)) return;
    if (account.isInvitation) { this.notifications.error("access.api.pendingActionError", "/acces"); return; }
    try {
      await firstValueFrom(this.api.setActive(account.id, account.access !== "active"));
      await this.reload(false);
    } catch { this.notifications.error("access.api.updateError", "/acces"); }
  }

  async deleteAccount(account: AccessAccount): Promise<void> {
    if (!this.canManageAccount(account)) return;
    try {
      if (account.isInvitation) await firstValueFrom(this.api.revokeInvitation(account.id));
      else await firstValueFrom(this.api.revoke(account.id));
      await this.reload(false);
    } catch { this.notifications.error("access.api.deleteError", "/acces"); }
  }

  async togglePermission(permission: AccessPermissionKey): Promise<void> {
    const selected = this.selectedAccount();
    if (!selected || !this.canManageAccount(selected)) return;
    if (selected.isInvitation) { this.notifications.error("access.api.pendingActionError", "/acces"); return; }
    const current = selected.permissions.find((entry) => entry.key === permission)?.enabled ?? false;
    try {
      await firstValueFrom(this.api.setPermission(selected.id, permission, !current));
      await this.reload(false);
    } catch { this.notifications.error("access.api.permissionError", "/acces"); }
  }

  openAssignments(account: AccessAccount): void {
    if (!this.canManageAccount(account)) return;
    this.selectedId.set(account.id);
    this.assignmentDrawerOpen.set(true);
  }

  async addAssignment(assignment: WorkspaceMembership): Promise<void> {
    const selected = this.selectedAccount();
    if (!selected || !this.canManageAccount(selected)) return;
    if (selected.isInvitation) { this.notifications.error("access.api.pendingActionError", "/acces"); return; }
    const org = this.workspace.organizations().find((x) => x.id === assignment.organizationId || x.apiId === assignment.organizationId);
    const site = this.workspace.sites().find((x) => x.id === assignment.siteId || x.apiId === assignment.siteId);
    let program: any = null;
    if (assignment.programId) {
      for (const candidateSite of this.workspace.sites()) {
        program = this.workspace.sitePrograms(candidateSite.id).find((x) => x.id === assignment.programId || x.apiId === assignment.programId);
        if (program) break;
      }
    }
    let cohort: any = null;
    if (assignment.cohortId) {
      for (const candidateSite of this.workspace.sites()) {
        cohort = this.workspace.siteCohorts(candidateSite.id).find((x) => x.id === assignment.cohortId || x.apiId === assignment.cohortId);
        if (cohort) break;
      }
    }
    try {
      await firstValueFrom(this.api.addAssignment(selected.id, {
        role: assignment.role,
        scope: assignment.scope,
        siteId: site?.apiId ?? null,
        programId: program?.apiId ?? null,
        cohortId: cohort?.apiId ?? null,
        examSessionId: assignment.examSessionId?.trim() || null,
      }));
      await this.reload(false);
    } catch { this.notifications.error("access.api.assignmentError", "/acces"); }
  }

  async removeAssignment(assignmentId: string): Promise<void> {
    const selected = this.selectedAccount();
    if (!selected || selected.isInvitation || !this.canManageAccount(selected)) return;
    try {
      await firstValueFrom(this.api.removeAssignment(selected.id, assignmentId));
      await this.reload(false);
    } catch { this.notifications.error("access.api.assignmentError", "/acces"); }
  }

  async invite(): Promise<void> {
    const firstName = this.inviteFirstName.trim();
    const lastName = this.inviteLastName.trim();
    const email = this.inviteEmail.trim();
    if (!firstName || !lastName || !email) return;
    try {
      const created = await firstValueFrom(this.api.invite({ firstName, lastName, email, role: this.inviteRole }));
      this.inviteFirstName = ""; this.inviteLastName = ""; this.inviteEmail = ""; this.inviteRole = "trainer";
      await this.reload(false);
      this.selectedId.set(created?.id ?? this.accounts().find((x) => x.email.toLowerCase() === email.toLowerCase())?.id ?? "");
    } catch { this.notifications.error("access.api.inviteError", "/acces"); }
  }

  private async reload(notify = true): Promise<void> {
    const sequence = ++this.loadSequence;
    try {
      const page = await firstValueFrom(this.api.list(1, "", 100));
      if (sequence !== this.loadSequence) return;
      const accounts = (page?.items ?? []).map((item) => this.mapAccount(item));
      this.accounts.set(accounts);
      if (!accounts.some((x) => x.id === this.selectedId())) this.selectedId.set(accounts[0]?.id ?? "");
    } catch {
      if (sequence !== this.loadSequence) return;
      this.accounts.set([]); this.selectedId.set("");
      if (notify) this.notifications.error("access.api.loadError", "/acces");
    }
  }

  private mapAccount(item: ProductAccount): AccessAccount {
    return {
      id: item?.id ?? "", email: item?.email ?? "", firstName: item?.firstName ?? "", lastName: item?.lastName ?? "",
      // Do not derive the select value from the complete Identity roles collection.
      // The backend exposes the canonical role attached to this application membership.
      role: this.mapMembershipRole(item?.primaryRole ? [item.primaryRole] : (item?.roles ?? [])),
      access: item?.status === "Invited" ? "invited" : item?.status === "Active" ? "active" : "suspended",
      permissions: (item?.permissions ?? []).map((x) => ({ key: x.key, enabled: !!x.enabled })),
      assignments: (item?.assignments ?? []).map((x) => ({
        id: x?.id ?? "", userId: x?.userId ?? item?.id ?? "", role: x?.role ?? "read_only", scope: x?.scope ?? "organization",
        organizationId: x?.organizationId ?? "", siteId: x?.siteId ?? "", programId: x?.programId ?? "",
        cohortId: x?.cohortId ?? "", examSessionId: x?.examSessionId ?? "", active: x?.active ?? false,
      })),
      isInvitation: !!item?.isInvitation,
    };
  }

  private mapMembershipRole(roles: string[]): MembershipRole {
    const values = roles.map((value) => (value ?? "").toLowerCase());
    if (values.some((value) => value.includes("organizationadministrator"))) return "organization_admin";
    if (values.some((value) => value.includes("organizationdirection"))) return "organization_direction";
    if (values.some((value) => value.includes("sitedirection"))) return "site_direction";
    if (values.some((value) => value.includes("pedagogicalmanager"))) return "pedagogical_manager";
    if (values.some((value) => value.includes("secretariat"))) return "secretariat";
    if (values.some((value) => value.includes("trainer"))) return "trainer";
    if (values.some((value) => value.includes("student"))) return "student";
    if (values.some((value) => value.includes("jury"))) return "jury";
    return "read_only";
  }
}
