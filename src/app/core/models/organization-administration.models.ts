// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { ProgramModule } from "./workspace.models";

export interface OrganizationAdminProfile {
  legalName: string;
  shortName: string;
  code: string;
  siret: string;
  trainingDeclarationNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  managerName: string;
}

export interface OrganizationAdminMetrics {
  users: number;
  trainers: number;
  students: number;
  activeCohorts: number;
}

export interface OrganizationBrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  loginTagline: string;
  logoLabel: string;
  whiteLabel: boolean;
  allowSiteOverrides: boolean;
}

export interface OrganizationModuleSetting {
  id: ProgramModule;
  icon: string;
  labelKey: string;
  descriptionKey: string;
  enabled: boolean;
}

export interface OrganizationPreference {
  id:
    | "absenceAlerts"
    | "certificationAlerts"
    | "weeklyDigest"
    | "autoArchive"
    | "strictAudit";
  icon: string;
  labelKey: string;
  descriptionKey: string;
  enabled: boolean;
}

export interface OrganizationAuditEntry {
  id: string;
  actor: string;
  initials: string;
  actionKey: string;
  detailKey: string;
  date: string;
  tone: "blue" | "green" | "amber";
}
