import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SKILL_DEFINITIONS } from "../../core/mock-data/skills.mock";
import {
  ACCESS_ROLE_SUMMARIES,
  ADMIN_USERS,
  HOUR_CATEGORIES,
  RECENT_ADMIN_ACTIONS,
  type AccessRoleSummary,
} from "../../core/mock-data/administration.mock";

@Component({
  selector: "app-administration",
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: "./administration.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministrationComponent {
  centreName = "Centre de formation ECSR Grand Ouest";
  city = "Nantes";
  approvalNumber = "E 24 044 0012 0";

  readonly users = ADMIN_USERS;
  readonly skills = SKILL_DEFINITIONS;
  readonly hourCategories = HOUR_CATEGORIES;
  readonly accessRoles = ACCESS_ROLE_SUMMARIES;
  readonly recentActions = RECENT_ADMIN_ACTIONS;
  readonly saved = signal(false);
  readonly inviteRequested = signal(false);

  saveCentre(): void {
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  invite(): void {
    this.inviteRequested.set(true);
    window.setTimeout(() => this.inviteRequested.set(false), 1800);
  }

  roleClasses(role: AccessRoleSummary): string {
    if (role.tone === "green") return "bg-[#d8f8df] text-[#18a547]";
    if (role.tone === "amber") return "bg-[#fff0c9] text-[#8b5e00]";
    return "bg-[#e6f2ff] text-[#2a64a2]";
  }
}
