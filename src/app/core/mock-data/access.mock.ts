import type { DemoSession, UserRole } from "../models/app.models";
import type { WorkspaceMembership } from "../models/workspace.models";

export type AccessState = "active" | "invited" | "suspended";
export type AccessPermissionKey =
  | "students"
  | "sessions"
  | "evaluations"
  | "documents"
  | "certification"
  | "reports"
  | "administration";

export interface AccessPermission {
  key: AccessPermissionKey;
  enabled: boolean;
}

export interface AccessAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Legacy/demo primary role. Effective access now comes from assignments. */
  role: UserRole;
  access: AccessState;
  detailKey?: string;
  permissions: AccessPermission[];
  assignments: WorkspaceMembership[];
}

const permissions = (enabled: AccessPermissionKey[]): AccessPermission[] =>
  ([
    "students",
    "sessions",
    "evaluations",
    "documents",
    "certification",
    "reports",
    "administration",
  ] as AccessPermissionKey[]).map((key) => ({ key, enabled: enabled.includes(key) }));

const directionPermissions = () =>
  permissions(["students", "sessions", "evaluations", "documents", "certification", "reports", "administration"]);
const trainerPermissions = () => permissions(["students", "sessions", "evaluations", "certification"]);
const secretariatPermissions = () => permissions(["students", "sessions", "documents", "certification", "reports"]);
const studentPermissions = () => permissions(["certification"]);
const juryPermissions = () => permissions(["evaluations", "documents", "certification"]);

const membership = (
  userId: string,
  suffix: string,
  value: Omit<WorkspaceMembership, "id" | "userId" | "active"> & { active?: boolean },
): WorkspaceMembership => ({ id: `${userId}-${suffix}`, userId, active: value.active ?? true, ...value });

export const ACCESS_ACCOUNTS: AccessAccount[] = [
  {
    id: "u1",
    firstName: "Claire",
    lastName: "Berthier",
    email: "c.berthier@tpecsrpilot.fr",
    role: "direction",
    access: "active",
    permissions: directionPermissions(),
    assignments: [membership("u1", "org", { role: "organization_direction", scope: "organization", organizationId: "org-aftral" })],
  },
  {
    id: "u2",
    firstName: "Nadia",
    lastName: "Lambert",
    email: "n.lambert@tpecsrpilot.fr",
    role: "secretariat",
    access: "active",
    permissions: secretariatPermissions(),
    assignments: [membership("u2", "nice", { role: "secretariat", scope: "site", organizationId: "org-aftral", siteId: "site-aftral-nice" })],
  },
  {
    id: "u3",
    firstName: "Marc",
    lastName: "Dupont",
    email: "m.dupont@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    detailKey: "access.userDetails.marc",
    permissions: trainerPermissions(),
    assignments: [
      membership("u3", "nice-ecsr", { role: "trainer", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr" }),
      membership("u3", "nice-moto", { role: "trainer", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-moto" }),
      membership("u3", "mrs-ecsr", { role: "read_only", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-marseille", programId: "program-ecsr" }),
    ],
  },
  {
    id: "u4",
    firstName: "Claire",
    lastName: "Roche",
    email: "c.roche@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
    assignments: [membership("u4", "nice-ecsr", { role: "pedagogical_manager", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr" })],
  },
  {
    id: "u5",
    firstName: "Yanis",
    lastName: "Morel",
    email: "y.morel@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
    assignments: [membership("u5", "nice-ecsr", { role: "trainer", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr" })],
  },
  {
    id: "u6",
    firstName: "Sophie",
    lastName: "Lemaire",
    email: "s.lemaire@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
    assignments: [membership("u6", "nice-pl", { role: "trainer", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-pl" })],
  },
  {
    id: "u7",
    firstName: "Ibrahim",
    lastName: "Traoré",
    email: "i.traore@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
    assignments: [membership("u7", "nice-bus", { role: "trainer", scope: "program", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-bus" })],
  },
  {
    id: "u8",
    firstName: "Sam",
    lastName: "Fokam",
    email: "s.fokam@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
    assignments: [membership("u8", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u9",
    firstName: "Julie",
    lastName: "Moreau",
    email: "j.moreau@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
    assignments: [membership("u9", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u10",
    firstName: "Marc",
    lastName: "Girard",
    email: "m.girard@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
    assignments: [membership("u10", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u11",
    firstName: "Léa",
    lastName: "Perrin",
    email: "l.perrin@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
    assignments: [membership("u11", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u12",
    firstName: "Karim",
    lastName: "Benali",
    email: "k.benali@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
    assignments: [membership("u12", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u13",
    firstName: "Thomas",
    lastName: "Roussel",
    email: "t.roussel@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "invited",
    permissions: studentPermissions(),
    assignments: [membership("u13", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u14",
    firstName: "Chloé",
    lastName: "Marchand",
    email: "c.marchand@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "invited",
    permissions: studentPermissions(),
    assignments: [membership("u14", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u15",
    firstName: "Mehdi",
    lastName: "Amrani",
    email: "m.amrani@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "invited",
    permissions: studentPermissions(),
    assignments: [membership("u15", "p1", { role: "student", scope: "cohort", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1" })],
  },
  {
    id: "u16",
    firstName: "Jean",
    lastName: "Martin",
    email: "jury@demo.tpecsrpilot.fr",
    role: "jury",
    access: "active",
    detailKey: "access.userDetails.jury",
    permissions: juryPermissions(),
    assignments: [membership("u16", "exam", { role: "jury", scope: "exam", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-ecsr", cohortId: "p1", examSessionId: "exam-2027-02" })],
  },
  {
    id: "u17",
    firstName: "Nicolas",
    lastName: "Mercier",
    email: "jury.moto@demo.tpecsrpilot.fr",
    role: "jury",
    access: "active",
    permissions: juryPermissions(),
    assignments: [membership("u17", "exam-moto", { role: "jury", scope: "exam", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-moto", cohortId: "cohort-nice-moto-2027-03", examSessionId: "exam-cohort-nice-moto-2027-03" })],
  },
  {
    id: "u18",
    firstName: "Patrick",
    lastName: "Roux",
    email: "jury.pl@demo.tpecsrpilot.fr",
    role: "jury",
    access: "active",
    permissions: juryPermissions(),
    assignments: [membership("u18", "exam-pl", { role: "jury", scope: "exam", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-pl", cohortId: "cohort-nice-pl-2027-01", examSessionId: "exam-cohort-nice-pl-2027-01" })],
  },
  {
    id: "u19",
    firstName: "Laurent",
    lastName: "Petit",
    email: "jury.bus@demo.tpecsrpilot.fr",
    role: "jury",
    access: "active",
    permissions: juryPermissions(),
    assignments: [membership("u19", "exam-bus", { role: "jury", scope: "exam", organizationId: "org-aftral", siteId: "site-aftral-nice", programId: "program-bus", cohortId: "cohort-nice-bus-2027-02", examSessionId: "exam-cohort-nice-bus-2027-02" })],
  },
];

export function accessAccountForSession(session: DemoSession | null): AccessAccount | null {
  if (!session) return null;

  const exact = ACCESS_ACCOUNTS.find(
    (item) => item.email.toLowerCase() === session.email.toLowerCase(),
  );
  if (exact) return exact;

  const fallbackId: Record<UserRole, string> = {
    direction: "u1",
    secretariat: "u2",
    formateur: "u3",
    stagiaire: "u8",
    jury: "u16",
  };

  return ACCESS_ACCOUNTS.find((item) => item.id === fallbackId[session.role]) ?? null;
}
