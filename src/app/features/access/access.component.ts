import { ChangeDetectionStrategy, Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { ACCESS_ACCOUNTS } from "../../core/api-data/runtime-data.store";
import type { AccessAccount, AccessPermissionKey } from "../../core/models/access.models";
import { ORGANIZATIONS, TRAINING_PROGRAMS, TRAINING_SITES } from "../../core/api-data/runtime-data.store";
import type { UserRole } from "../../core/models/app.models";
import type { WorkspaceMembership } from "../../core/models/workspace.models";
import { AccessAssignmentDrawerComponent } from "./access-assignment-drawer/access-assignment-drawer.component";

@Component({
  selector: "app-access",
  imports: [FormsModule, TranslatePipe, AccessAssignmentDrawerComponent],
  templateUrl: "./access.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessComponent {
  readonly accounts = signal<AccessAccount[]>(structuredClone(ACCESS_ACCOUNTS));
  readonly search = signal("");
  readonly roleFilter = signal<"all" | UserRole>("all");
  readonly selectedId = signal("u3");
  readonly assignmentDrawerOpen = signal(false);

  inviteFirstName = "";
  inviteLastName = "";
  inviteEmail = "";
  inviteRole: UserRole = "formateur";

  readonly stats = computed(() => {
    const values = this.accounts();
    return {
      total: values.length,
      active: values.filter((item) => item.access === "active").length,
      assignments: values.reduce((sum, item) => sum + item.assignments.length, 0),
      multiScope: values.filter((item) => item.assignments.length > 1).length,
    };
  });

  readonly filteredAccounts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase("fr-FR");
    const role = this.roleFilter();
    return this.accounts().filter((account) => {
      const matchesRole = role === "all" || account.role === role;
      const assignmentText = account.assignments
        .map((assignment) => `${this.organizationName(assignment.organizationId)} ${this.siteName(assignment.siteId)} ${this.programName(assignment.programId)}`)
        .join(" ");
      const haystack = `${account.firstName} ${account.lastName} ${account.email} ${assignmentText}`.toLocaleLowerCase("fr-FR");
      return matchesRole && (!query || haystack.includes(query));
    });
  });

  readonly selectedAccount = computed(
    () => this.accounts().find((item) => item.id === this.selectedId()) ?? this.accounts()[0],
  );

  initials(account: AccessAccount): string {
    return `${account.firstName[0] ?? ""}${account.lastName[0] ?? ""}`.toUpperCase();
  }

  roleKey(role: UserRole): string {
    return `access.roles.${role}`;
  }

  stateKey(account: AccessAccount): string {
    return `access.states.${account.access}`;
  }

  organizationName(id?: string): string {
    return ORGANIZATIONS.find((item) => item.id === id)?.shortName ?? "—";
  }

  siteName(id?: string): string {
    return TRAINING_SITES.find((item) => item.id === id)?.city ?? "—";
  }

  programName(id?: string): string {
    return TRAINING_PROGRAMS.find((item) => item.id === id)?.name ?? "—";
  }

  assignmentSummary(account: AccessAccount): string {
    if (!account.assignments.length) return "—";
    const first = account.assignments[0];
    const pieces = [this.organizationName(first.organizationId)];
    if (first.siteId) pieces.push(this.siteName(first.siteId));
    if (first.programId) pieces.push(this.programName(first.programId));
    return pieces.filter((part) => part !== "—").join(" · ");
  }

  select(account: AccessAccount): void {
    this.selectedId.set(account.id);
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setRoleFilter(value: string): void {
    this.roleFilter.set(value as "all" | UserRole);
  }

  toggleAccess(account: AccessAccount): void {
    this.accounts.update((items) =>
      items.map((item) =>
        item.id === account.id
          ? { ...item, access: item.access === "active" ? "suspended" : "active" }
          : item,
      ),
    );
  }

  deleteAccount(account: AccessAccount): void {
    this.accounts.update((items) => items.filter((item) => item.id !== account.id));
    if (this.selectedId() === account.id) this.selectedId.set(this.accounts()[0]?.id ?? "");
  }

  togglePermission(permission: AccessPermissionKey): void {
    const selected = this.selectedAccount();
    if (!selected) return;
    this.accounts.update((items) =>
      items.map((item) =>
        item.id !== selected.id
          ? item
          : {
              ...item,
              permissions: item.permissions.map((entry) =>
                entry.key === permission ? { ...entry, enabled: !entry.enabled } : entry,
              ),
            },
      ),
    );
  }

  openAssignments(account: AccessAccount): void {
    this.selectedId.set(account.id);
    this.assignmentDrawerOpen.set(true);
  }

  addAssignment(assignment: WorkspaceMembership): void {
    const selected = this.selectedAccount();
    if (!selected) return;
    this.accounts.update((items) =>
      items.map((item) => item.id === selected.id ? { ...item, assignments: [...item.assignments, assignment] } : item),
    );
  }

  removeAssignment(assignmentId: string): void {
    const selected = this.selectedAccount();
    if (!selected) return;
    this.accounts.update((items) =>
      items.map((item) => item.id === selected.id ? { ...item, assignments: item.assignments.filter((assignment) => assignment.id !== assignmentId) } : item),
    );
  }

  invite(): void {
    if (!this.inviteFirstName.trim() || !this.inviteLastName.trim() || !this.inviteEmail.trim()) return;
    const nextId = `u${Date.now()}`;
    const account: AccessAccount = {
      id: nextId,
      firstName: this.inviteFirstName.trim(),
      lastName: this.inviteLastName.trim(),
      email: this.inviteEmail.trim(),
      role: this.inviteRole,
      access: "invited",
      permissions: this.defaultPermissions(this.inviteRole),
      assignments: [],
    };
    this.accounts.update((items) => [...items, account]);
    this.selectedId.set(nextId);
    this.inviteFirstName = "";
    this.inviteLastName = "";
    this.inviteEmail = "";
    this.inviteRole = "formateur";
    this.assignmentDrawerOpen.set(true);
  }

  private defaultPermissions(role: UserRole) {
    const enabled: AccessPermissionKey[] =
      role === "direction"
        ? ["students", "sessions", "evaluations", "documents", "certification", "reports", "administration"]
        : role === "secretariat"
          ? ["students", "sessions", "documents", "certification", "reports"]
          : role === "formateur"
            ? ["students", "sessions", "evaluations", "certification"]
            : role === "jury"
              ? ["evaluations", "documents", "certification"]
              : ["certification"];
    return (["students", "sessions", "evaluations", "documents", "certification", "reports", "administration"] as AccessPermissionKey[])
      .map((key) => ({ key, enabled: enabled.includes(key) }));
  }
}
