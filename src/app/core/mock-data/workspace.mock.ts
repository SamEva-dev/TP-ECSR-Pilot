import type {
  Organization,
  ProgramOffering,
  TrainingProgram,
  TrainingSite,
  WorkspaceAccessRule,
  WorkspaceCohort,
} from "../models/workspace.models";
import type { DemoSession } from "../models/app.models";
import { ACCESS_ACCOUNTS } from "./access.mock";

export const ORGANIZATIONS: Organization[] = [
  {
    id: "org-aftral",
    code: "AFTRAL",
    name: "AFTRAL",
    shortName: "AFTRAL",
    city: "Paris",
    active: true,
    primaryColor: "#1456A0",
    secondaryColor: "#F59E0B",
  },
  {
    id: "org-ecf",
    code: "ECF",
    name: "ECF",
    shortName: "ECF",
    city: "Paris",
    active: true,
    primaryColor: "#1456A0",
    secondaryColor: "#F59E0B",
  },
  {
    id: "org-horizon",
    code: "HORIZON",
    name: "Centre Horizon Conduite",
    shortName: "Horizon",
    city: "Nice",
    active: true,
    primaryColor: "#1456A0",
    secondaryColor: "#F59E0B",
  },
];

export const TRAINING_SITES: TrainingSite[] = [
  { id: "site-aftral-nice", organizationId: "org-aftral", code: "NCE", name: "AFTRAL Nice", city: "Nice", active: true },
  { id: "site-aftral-marseille", organizationId: "org-aftral", code: "MRS", name: "AFTRAL Marseille", city: "Marseille", active: true },
  { id: "site-aftral-toulouse", organizationId: "org-aftral", code: "TLS", name: "AFTRAL Toulouse", city: "Toulouse", active: true },
  { id: "site-ecf-nice", organizationId: "org-ecf", code: "ECF-NCE", name: "ECF Nice", city: "Nice", active: true },
  { id: "site-ecf-cannes", organizationId: "org-ecf", code: "ECF-CAN", name: "ECF Cannes", city: "Cannes", active: true },
  { id: "site-horizon-nice", organizationId: "org-horizon", code: "HZ-NCE", name: "Horizon Nice", city: "Nice", active: true },
];

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: "program-ecsr",
    code: "ECSR",
    name: "TP ECSR",
    category: "teacher",
    icon: "ph-steering-wheel",
    active: true,
    enabledModules: ["planning", "attendance", "sessions", "driving", "sheets", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
  },
  {
    id: "program-moto",
    code: "MOTO",
    name: "Formation Moto",
    category: "motorcycle",
    icon: "ph-motorcycle",
    active: true,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
  },
  {
    id: "program-pl",
    code: "PL",
    name: "Poids lourd",
    category: "heavy-vehicle",
    icon: "ph-truck",
    active: true,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
  },
  {
    id: "program-bus",
    code: "BUS",
    name: "Transport voyageurs / Bus",
    category: "passenger-transport",
    icon: "ph-bus",
    active: true,
    enabledModules: ["planning", "attendance", "sessions", "driving", "plateau", "skills", "internships", "documents", "assessments", "certification", "distanceLearning", "statistics"],
  },
];

export const PROGRAM_OFFERINGS: ProgramOffering[] = [
  { id: "off-aftral-nice-ecsr", siteId: "site-aftral-nice", programId: "program-ecsr", active: true },
  { id: "off-aftral-nice-moto", siteId: "site-aftral-nice", programId: "program-moto", active: true },
  { id: "off-aftral-nice-pl", siteId: "site-aftral-nice", programId: "program-pl", active: true },
  { id: "off-aftral-nice-bus", siteId: "site-aftral-nice", programId: "program-bus", active: true },
  { id: "off-aftral-marseille-ecsr", siteId: "site-aftral-marseille", programId: "program-ecsr", active: true },
  { id: "off-aftral-marseille-moto", siteId: "site-aftral-marseille", programId: "program-moto", active: true },
  { id: "off-aftral-marseille-pl", siteId: "site-aftral-marseille", programId: "program-pl", active: true },
  { id: "off-aftral-toulouse-ecsr", siteId: "site-aftral-toulouse", programId: "program-ecsr", active: true },
  { id: "off-aftral-toulouse-bus", siteId: "site-aftral-toulouse", programId: "program-bus", active: true },
  { id: "off-ecf-nice-ecsr", siteId: "site-ecf-nice", programId: "program-ecsr", active: true },
  { id: "off-ecf-nice-moto", siteId: "site-ecf-nice", programId: "program-moto", active: true },
  { id: "off-ecf-cannes-ecsr", siteId: "site-ecf-cannes", programId: "program-ecsr", active: true },
  { id: "off-horizon-nice-ecsr", siteId: "site-horizon-nice", programId: "program-ecsr", active: true },
];

export const WORKSPACE_COHORTS: WorkspaceCohort[] = [
  { id: "p1", offeringId: "off-aftral-nice-ecsr", referentialVersionId: "ref-ecsr-2026", name: "TP ECSR 2026–2027", shortName: "2026–2027", start: "2026-09-01", end: "2027-06-30", status: "active", studentCount: 18, legacyPromotionId: "p1" },
  { id: "p2", offeringId: "off-aftral-nice-ecsr", referentialVersionId: "ref-ecsr-2024", name: "TP ECSR 2025–2026", shortName: "2025–2026", start: "2025-09-02", end: "2026-06-26", status: "completed", studentCount: 24, legacyPromotionId: "p2" },
  { id: "cohort-nice-moto-2027-03", offeringId: "off-aftral-nice-moto", referentialVersionId: "ref-moto-2027", name: "Moto · Mars 2027", shortName: "Mars 2027", start: "2027-03-01", end: "2027-05-28", status: "planned", studentCount: 14 },
  { id: "cohort-nice-pl-2027-01", offeringId: "off-aftral-nice-pl", referentialVersionId: "ref-pl-2027", name: "Poids lourd · Janvier 2027", shortName: "Janv. 2027", start: "2027-01-11", end: "2027-04-02", status: "planned", studentCount: 12 },
  { id: "cohort-nice-bus-2027-02", offeringId: "off-aftral-nice-bus", referentialVersionId: "ref-bus-2027", name: "Bus · Février 2027", shortName: "Févr. 2027", start: "2027-02-08", end: "2027-05-14", status: "planned", studentCount: 10 },
  { id: "cohort-mrs-ecsr-2026", offeringId: "off-aftral-marseille-ecsr", referentialVersionId: "ref-ecsr-2026", name: "TP ECSR 2026–2027", shortName: "2026–2027", start: "2026-09-01", end: "2027-06-30", status: "active", studentCount: 16 },
  { id: "cohort-mrs-moto-2027-01", offeringId: "off-aftral-marseille-moto", referentialVersionId: "ref-moto-2027", name: "Moto · Janvier 2027", shortName: "Janv. 2027", start: "2027-01-18", end: "2027-04-16", status: "planned", studentCount: 12 },
  { id: "cohort-mrs-pl-2027-02", offeringId: "off-aftral-marseille-pl", referentialVersionId: "ref-pl-2027", name: "Poids lourd · Février 2027", shortName: "Févr. 2027", start: "2027-02-01", end: "2027-04-30", status: "planned", studentCount: 15 },
  { id: "cohort-tls-ecsr-2026", offeringId: "off-aftral-toulouse-ecsr", referentialVersionId: "ref-ecsr-2026", name: "TP ECSR 2026–2027", shortName: "2026–2027", start: "2026-09-07", end: "2027-07-02", status: "active", studentCount: 17 },
  { id: "cohort-tls-bus-2027-01", offeringId: "off-aftral-toulouse-bus", referentialVersionId: "ref-bus-2027", name: "Bus · Janvier 2027", shortName: "Janv. 2027", start: "2027-01-04", end: "2027-04-09", status: "planned", studentCount: 11 },
  { id: "cohort-ecf-nice-ecsr-2026", offeringId: "off-ecf-nice-ecsr", referentialVersionId: "ref-ecsr-2026", name: "TP ECSR 2026–2027", shortName: "2026–2027", start: "2026-09-01", end: "2027-06-30", status: "active", studentCount: 15 },
  { id: "cohort-ecf-nice-moto-2027", offeringId: "off-ecf-nice-moto", referentialVersionId: "ref-moto-2027", name: "Moto · Avril 2027", shortName: "Avr. 2027", start: "2027-04-05", end: "2027-06-25", status: "planned", studentCount: 10 },
  { id: "cohort-ecf-cannes-ecsr-2026", offeringId: "off-ecf-cannes-ecsr", referentialVersionId: "ref-ecsr-2026", name: "TP ECSR 2026–2027", shortName: "2026–2027", start: "2026-09-14", end: "2027-07-09", status: "active", studentCount: 13 },
  { id: "cohort-horizon-ecsr-2026", offeringId: "off-horizon-nice-ecsr", referentialVersionId: "ref-ecsr-2026", name: "TP ECSR 2026–2027", shortName: "2026–2027", start: "2026-10-05", end: "2027-07-30", status: "active", studentCount: 9 },
];

export function workspaceAccessFor(session: DemoSession | null): WorkspaceAccessRule {
  if (!session) return { scope: "cohort", cohortIds: ["p1"], locked: true };

  const account = ACCESS_ACCOUNTS.find(
    (item) => item.email.toLowerCase() === session.email.toLowerCase(),
  );

  // Demo aliases (claire@demo..., marc@demo...) resolve by legacy role when no
  // exact access-management account exists yet.
  const assignments = account?.assignments ??
    (session.role === "direction"
      ? ACCESS_ACCOUNTS.find((item) => item.id === "u1")?.assignments
      : session.role === "secretariat"
        ? ACCESS_ACCOUNTS.find((item) => item.id === "u2")?.assignments
        : session.role === "formateur"
          ? ACCESS_ACCOUNTS.find((item) => item.id === "u3")?.assignments
          : session.role === "stagiaire"
            ? ACCESS_ACCOUNTS.find((item) => item.id === "u8")?.assignments
            : ACCESS_ACCOUNTS.find((item) => item.id === "u16")?.assignments) ?? [];

  const active = assignments.filter((item) => item.active);
  if (active.some((item) => item.scope === "platform")) return { scope: "platform" };

  const organizationIds = [...new Set(active.filter((item) => item.scope === "organization").map((item) => item.organizationId).filter((id): id is string => !!id))];
  if (organizationIds.length) return { scope: "organization", organizationIds };

  const siteIds = [...new Set(active.filter((item) => item.scope === "site").map((item) => item.siteId).filter((id): id is string => !!id))];
  if (siteIds.length) return { scope: "site", siteIds };

  const programAssignments = active.filter((item) => item.scope === "program");
  if (programAssignments.length) {
    const offeringIds = PROGRAM_OFFERINGS
      .filter((offering) => programAssignments.some((assignment) => assignment.siteId === offering.siteId && assignment.programId === offering.programId))
      .map((offering) => offering.id);
    return { scope: "program", offeringIds: [...new Set(offeringIds)] };
  }

  const cohortIds = [...new Set(active.filter((item) => item.scope === "cohort" || item.scope === "exam").map((item) => item.cohortId).filter((id): id is string => !!id))];
  if (cohortIds.length) return { scope: "cohort", cohortIds, locked: active.every((item) => item.role === "student" || item.role === "jury") };

  return { scope: "cohort", cohortIds: [session.promotionId || "p1"], locked: true };
}
