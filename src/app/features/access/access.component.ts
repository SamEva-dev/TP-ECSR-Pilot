import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import {
  ACCESS_ACCOUNTS,
  type AccessAccount,
  type AccessPermissionKey,
} from "../../core/mock-data/access.mock";
import type { UserRole } from "../../core/models/app.models";

@Component({
  selector: "app-access",
  imports: [FormsModule, TranslatePipe],
  templateUrl: "./access.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessComponent {
  readonly accounts = signal<AccessAccount[]>(structuredClone(ACCESS_ACCOUNTS));
  readonly search = signal("");
  readonly roleFilter = signal<"all" | UserRole>("all");
  readonly selectedId = signal("u3");

  inviteFirstName = "";
  inviteLastName = "";
  inviteEmail = "";
  inviteRole: UserRole = "formateur";

  readonly stats = computed(() => {
    const values = this.accounts();
    return {
      total: values.length,
      active: values.filter((item) => item.access === "active").length,
      invited: values.filter((item) => item.access === "invited").length,
      suspended: values.filter((item) => item.access === "suspended").length,
    };
  });

  readonly filteredAccounts = computed(() => {
    const query = this.search().trim().toLocaleLowerCase("fr-FR");
    const role = this.roleFilter();
    return this.accounts().filter((account) => {
      const matchesRole = role === "all" || account.role === role;
      const haystack =
        `${account.firstName} ${account.lastName} ${account.email}`.toLocaleLowerCase(
          "fr-FR",
        );
      return matchesRole && (!query || haystack.includes(query));
    });
  });

  readonly selectedAccount = computed(
    () =>
      this.accounts().find((item) => item.id === this.selectedId()) ??
      this.accounts()[0],
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
          ? {
              ...item,
              access: item.access === "active" ? "suspended" : "active",
            }
          : item,
      ),
    );
  }

  deleteAccount(account: AccessAccount): void {
    this.accounts.update((items) =>
      items.filter((item) => item.id !== account.id),
    );
    if (this.selectedId() === account.id) {
      this.selectedId.set(this.accounts()[0]?.id ?? "");
    }
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
                entry.key === permission
                  ? { ...entry, enabled: !entry.enabled }
                  : entry,
              ),
            },
      ),
    );
  }

  invite(): void {
    if (
      !this.inviteFirstName.trim() ||
      !this.inviteLastName.trim() ||
      !this.inviteEmail.trim()
    )
      return;

    const nextId = `u${Date.now()}`;
    const permissions = this.defaultPermissions(this.inviteRole);
    const account: AccessAccount = {
      id: nextId,
      firstName: this.inviteFirstName.trim(),
      lastName: this.inviteLastName.trim(),
      email: this.inviteEmail.trim(),
      role: this.inviteRole,
      access: "invited",
      permissions,
    };
    this.accounts.update((items) => [...items, account]);
    this.selectedId.set(nextId);
    this.inviteFirstName = "";
    this.inviteLastName = "";
    this.inviteEmail = "";
    this.inviteRole = "formateur";
  }

  private defaultPermissions(role: UserRole) {
    const enabled: AccessPermissionKey[] =
      role === "direction"
        ? [
            "students",
            "sessions",
            "evaluations",
            "documents",
            "certification",
            "reports",
            "administration",
          ]
        : role === "secretariat"
          ? ["students", "sessions", "documents", "certification", "reports"]
          : role === "formateur"
            ? ["students", "sessions", "evaluations", "certification"]
            : role === "jury"
              ? ["evaluations", "documents", "certification"]
              : role === "stagiaire"
                ? ["certification"]
                : [];
    return (
      [
        "students",
        "sessions",
        "evaluations",
        "documents",
        "certification",
        "reports",
        "administration",
      ] as AccessPermissionKey[]
    ).map((key) => ({ key, enabled: enabled.includes(key) }));
  }
}
