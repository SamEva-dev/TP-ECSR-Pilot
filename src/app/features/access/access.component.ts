import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import type { AccessAccount, AccessPermissionKey } from "../../core/access/access.models";
import { PedagoraAccessApiService, type ProductAccount } from "../../core/access/pedagora-access-api.service";
import { ApplicationNotificationService } from "../../core/notifications/application-notification.service";
import type { UserRole } from "../../core/models/app.models";
import type { WorkspaceMembership } from "../../core/models/workspace.models";
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
  readonly workspace = inject(WorkspaceContextService);

  readonly accounts = signal<AccessAccount[]>([]);
  readonly search = signal("");
  readonly roleFilter = signal<"all" | UserRole>("all");
  readonly selectedId = signal("");
  readonly assignmentDrawerOpen = signal(false);
  private loadSequence = 0;

  inviteFirstName = "";
  inviteLastName = "";
  inviteEmail = "";
  inviteRole: UserRole = "formateur";

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
    effect(() => {
      const organizationApiId = this.workspace.organization()?.apiId ?? "";
      if (!organizationApiId) {
        this.accounts.set([]);
        this.selectedId.set("");
        return;
      }
      untracked(() => void this.reload());
    });
  }

  initials(account: AccessAccount): string {
    return `${account.firstName?.[0] ?? ""}${account.lastName?.[0] ?? ""}`.toUpperCase();
  }
  roleKey(role: UserRole): string { return `access.roles.${role}`; }
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
  setRoleFilter(value: string): void { this.roleFilter.set((value || "all") as "all" | UserRole); }

  async toggleAccess(account: AccessAccount): Promise<void> {
    if (account.isInvitation) { this.notifications.error("access.api.pendingActionError", "/acces"); return; }
    try {
      await firstValueFrom(this.api.setActive(account.id, account.access !== "active"));
      await this.reload(false);
    } catch { this.notifications.error("access.api.updateError", "/acces"); }
  }

  async deleteAccount(account: AccessAccount): Promise<void> {
    try {
      if (account.isInvitation) await firstValueFrom(this.api.revokeInvitation(account.id));
      else await firstValueFrom(this.api.revoke(account.id));
      await this.reload(false);
    } catch { this.notifications.error("access.api.deleteError", "/acces"); }
  }

  async togglePermission(permission: AccessPermissionKey): Promise<void> {
    const selected = this.selectedAccount();
    if (!selected) return;
    if (selected.isInvitation) { this.notifications.error("access.api.pendingActionError", "/acces"); return; }
    const current = selected.permissions.find((entry) => entry.key === permission)?.enabled ?? false;
    try {
      await firstValueFrom(this.api.setPermission(selected.id, permission, !current));
      await this.reload(false);
    } catch { this.notifications.error("access.api.permissionError", "/acces"); }
  }

  openAssignments(account: AccessAccount): void {
    this.selectedId.set(account.id);
    this.assignmentDrawerOpen.set(true);
  }

  async addAssignment(assignment: WorkspaceMembership): Promise<void> {
    const selected = this.selectedAccount();
    if (!selected) return;
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
    if (!selected || selected.isInvitation) return;
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
      this.inviteFirstName = ""; this.inviteLastName = ""; this.inviteEmail = ""; this.inviteRole = "formateur";
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
      role: this.mapRole(item?.roles ?? []),
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

  private mapRole(roles: string[]): UserRole {
    const value = (roles[0] ?? "").toLowerCase();
    if (value.includes("student")) return "stagiaire";
    if (value.includes("secretariat")) return "secretariat";
    if (value.includes("jury")) return "jury";
    if (value.includes("trainer") || value.includes("pedagogicalmanager")) return "formateur";
    return "direction";
  }
}
