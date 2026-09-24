// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

export interface AdminUserSummary {
  id: string;
  initials: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AccessRoleSummary {
  role: "direction" | "formateur" | "stagiaire" | "secretariat";
  icon: string;
  tone: "blue" | "green" | "amber";
  descriptionKey: string;
}

export interface HourCategory {
  key: string;
  labelKey: string;
}

export interface RecentAdminAction {
  id: string;
  titleKey: string;
  metaKey: string;
}
