import type { ProgramModule } from "../models/workspace.models";

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
  id: "absenceAlerts" | "certificationAlerts" | "weeklyDigest" | "autoArchive" | "strictAudit";
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

const PROFILES: Record<string, OrganizationAdminProfile> = {
  "org-aftral": {
    legalName: "AFTRAL — Démonstration",
    shortName: "AFTRAL",
    code: "AFTRAL",
    siret: "000 000 000 00000",
    trainingDeclarationNumber: "DEMO-ORG-001",
    address: "10 avenue de la Formation",
    postalCode: "75000",
    city: "Paris",
    country: "France",
    email: "direction@demo.tpecsrpilot.fr",
    phone: "+33 1 00 00 00 00",
    website: "https://demo.tpecsrpilot.fr",
    managerName: "Claire Berthier",
  },
  "org-ecf": {
    legalName: "ECF — Démonstration",
    shortName: "ECF",
    code: "ECF",
    siret: "111 111 111 11111",
    trainingDeclarationNumber: "DEMO-ORG-002",
    address: "24 boulevard des Apprentissages",
    postalCode: "06000",
    city: "Nice",
    country: "France",
    email: "direction.ecf@demo.tpecsrpilot.fr",
    phone: "+33 4 00 00 00 00",
    website: "https://demo.tpecsrpilot.fr",
    managerName: "Sophie Lemaire",
  },
  "org-horizon": {
    legalName: "Centre Horizon Conduite — Démonstration",
    shortName: "Horizon",
    code: "HORIZON",
    siret: "222 222 222 22222",
    trainingDeclarationNumber: "DEMO-ORG-003",
    address: "8 rue de la Mobilité",
    postalCode: "06000",
    city: "Nice",
    country: "France",
    email: "contact.horizon@demo.tpecsrpilot.fr",
    phone: "+33 4 11 11 11 11",
    website: "https://demo.tpecsrpilot.fr",
    managerName: "Yanis Morel",
  },
};

const METRICS: Record<string, OrganizationAdminMetrics> = {
  "org-aftral": { users: 186, trainers: 42, students: 1284, activeCohorts: 8 },
  "org-ecf": { users: 74, trainers: 18, students: 412, activeCohorts: 3 },
  "org-horizon": { users: 14, trainers: 6, students: 74, activeCohorts: 1 },
};

const BRANDING: Record<string, OrganizationBrandingSettings> = {
  "org-aftral": {
    primaryColor: "#1456A0",
    secondaryColor: "#F59E0B",
    loginTagline: "Pilotez vos formations, simplement.",
    logoLabel: "AFTRAL",
    whiteLabel: false,
    allowSiteOverrides: true,
  },
  "org-ecf": {
    primaryColor: "#1456A0",
    secondaryColor: "#F59E0B",
    loginTagline: "Le suivi pédagogique de votre réseau.",
    logoLabel: "ECF",
    whiteLabel: false,
    allowSiteOverrides: true,
  },
  "org-horizon": {
    primaryColor: "#1456A0",
    secondaryColor: "#F59E0B",
    loginTagline: "Votre centre, vos parcours, un seul pilotage.",
    logoLabel: "Horizon",
    whiteLabel: false,
    allowSiteOverrides: false,
  },
};

export const ORGANIZATION_MODULE_SETTINGS: OrganizationModuleSetting[] = [
  { id: "planning", icon: "ph-calendar-dots", labelKey: "organizationAdmin.modules.items.planning.title", descriptionKey: "organizationAdmin.modules.items.planning.description", enabled: true },
  { id: "attendance", icon: "ph-clipboard-text", labelKey: "organizationAdmin.modules.items.attendance.title", descriptionKey: "organizationAdmin.modules.items.attendance.description", enabled: true },
  { id: "sessions", icon: "ph-list-bullets", labelKey: "organizationAdmin.modules.items.sessions.title", descriptionKey: "organizationAdmin.modules.items.sessions.description", enabled: true },
  { id: "driving", icon: "ph-car", labelKey: "organizationAdmin.modules.items.driving.title", descriptionKey: "organizationAdmin.modules.items.driving.description", enabled: true },
  { id: "plateau", icon: "ph-traffic-cone", labelKey: "organizationAdmin.modules.items.plateau.title", descriptionKey: "organizationAdmin.modules.items.plateau.description", enabled: true },
  { id: "sheets", icon: "ph-presentation-chart", labelKey: "organizationAdmin.modules.items.sheets.title", descriptionKey: "organizationAdmin.modules.items.sheets.description", enabled: true },
  { id: "skills", icon: "ph-target", labelKey: "organizationAdmin.modules.items.skills.title", descriptionKey: "organizationAdmin.modules.items.skills.description", enabled: true },
  { id: "internships", icon: "ph-briefcase", labelKey: "organizationAdmin.modules.items.internships.title", descriptionKey: "organizationAdmin.modules.items.internships.description", enabled: true },
  { id: "documents", icon: "ph-folder-open", labelKey: "organizationAdmin.modules.items.documents.title", descriptionKey: "organizationAdmin.modules.items.documents.description", enabled: true },
  { id: "certification", icon: "ph-certificate", labelKey: "organizationAdmin.modules.items.certification.title", descriptionKey: "organizationAdmin.modules.items.certification.description", enabled: true },
  { id: "statistics", icon: "ph-chart-line-up", labelKey: "organizationAdmin.modules.items.statistics.title", descriptionKey: "organizationAdmin.modules.items.statistics.description", enabled: true },
];

export const ORGANIZATION_PREFERENCES: OrganizationPreference[] = [
  { id: "absenceAlerts", icon: "ph-warning", labelKey: "organizationAdmin.settings.items.absenceAlerts.title", descriptionKey: "organizationAdmin.settings.items.absenceAlerts.description", enabled: true },
  { id: "certificationAlerts", icon: "ph-certificate", labelKey: "organizationAdmin.settings.items.certificationAlerts.title", descriptionKey: "organizationAdmin.settings.items.certificationAlerts.description", enabled: true },
  { id: "weeklyDigest", icon: "ph-envelope-simple", labelKey: "organizationAdmin.settings.items.weeklyDigest.title", descriptionKey: "organizationAdmin.settings.items.weeklyDigest.description", enabled: true },
  { id: "autoArchive", icon: "ph-archive", labelKey: "organizationAdmin.settings.items.autoArchive.title", descriptionKey: "organizationAdmin.settings.items.autoArchive.description", enabled: false },
  { id: "strictAudit", icon: "ph-shield-check", labelKey: "organizationAdmin.settings.items.strictAudit.title", descriptionKey: "organizationAdmin.settings.items.strictAudit.description", enabled: true },
];

export const ORGANIZATION_AUDIT: OrganizationAuditEntry[] = [
  { id: "oa1", actor: "Claire Berthier", initials: "CB", actionKey: "organizationAdmin.audit.items.site.title", detailKey: "organizationAdmin.audit.items.site.detail", date: "21/09/2026 · 14:12", tone: "blue" },
  { id: "oa2", actor: "Nadia Lambert", initials: "NL", actionKey: "organizationAdmin.audit.items.assignment.title", detailKey: "organizationAdmin.audit.items.assignment.detail", date: "21/09/2026 · 11:38", tone: "green" },
  { id: "oa3", actor: "Claire Berthier", initials: "CB", actionKey: "organizationAdmin.audit.items.program.title", detailKey: "organizationAdmin.audit.items.program.detail", date: "20/09/2026 · 17:04", tone: "amber" },
  { id: "oa4", actor: "Système", initials: "SY", actionKey: "organizationAdmin.audit.items.archive.title", detailKey: "organizationAdmin.audit.items.archive.detail", date: "20/09/2026 · 02:00", tone: "blue" },
];

export function organizationProfileFor(id: string | undefined): OrganizationAdminProfile {
  return { ...(PROFILES[id ?? "org-aftral"] ?? PROFILES["org-aftral"]) };
}

export function organizationMetricsFor(id: string | undefined): OrganizationAdminMetrics {
  return { ...(METRICS[id ?? "org-aftral"] ?? METRICS["org-aftral"]) };
}

export function organizationBrandingFor(id: string | undefined): OrganizationBrandingSettings {
  return { ...(BRANDING[id ?? "org-aftral"] ?? BRANDING["org-aftral"]) };
}
