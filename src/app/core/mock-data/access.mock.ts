import type { UserRole } from "../models/app.models";

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
  role: UserRole;
  access: AccessState;
  detailKey?: string;
  permissions: AccessPermission[];
}

const trainerPermissions = (): AccessPermission[] => [
  { key: "students", enabled: true },
  { key: "sessions", enabled: true },
  { key: "evaluations", enabled: true },
  { key: "documents", enabled: false },
  { key: "certification", enabled: true },
  { key: "reports", enabled: false },
  { key: "administration", enabled: false },
];

const secretariatPermissions = (): AccessPermission[] => [
  { key: "students", enabled: true },
  { key: "sessions", enabled: true },
  { key: "evaluations", enabled: false },
  { key: "documents", enabled: true },
  { key: "certification", enabled: true },
  { key: "reports", enabled: true },
  { key: "administration", enabled: false },
];

const studentPermissions = (): AccessPermission[] => [
  { key: "students", enabled: false },
  { key: "sessions", enabled: false },
  { key: "evaluations", enabled: false },
  { key: "documents", enabled: false },
  { key: "certification", enabled: true },
  { key: "reports", enabled: false },
  { key: "administration", enabled: false },
];

const directionPermissions = (): AccessPermission[] => [
  { key: "students", enabled: true },
  { key: "sessions", enabled: true },
  { key: "evaluations", enabled: true },
  { key: "documents", enabled: true },
  { key: "certification", enabled: true },
  { key: "reports", enabled: true },
  { key: "administration", enabled: true },
];

const juryPermissions = (): AccessPermission[] => [
  { key: "students", enabled: false },
  { key: "sessions", enabled: false },
  { key: "evaluations", enabled: true },
  { key: "documents", enabled: true },
  { key: "certification", enabled: true },
  { key: "reports", enabled: false },
  { key: "administration", enabled: false },
];

export const ACCESS_ACCOUNTS: AccessAccount[] = [
  {
    id: "u1",
    firstName: "Claire",
    lastName: "Berthier",
    email: "c.berthier@tpecsrpilot.fr",
    role: "direction",
    access: "active",
    permissions: directionPermissions(),
  },
  {
    id: "u2",
    firstName: "Nadia",
    lastName: "Lambert",
    email: "n.lambert@tpecsrpilot.fr",
    role: "secretariat",
    access: "active",
    permissions: secretariatPermissions(),
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
  },
  {
    id: "u4",
    firstName: "Claire",
    lastName: "Berthier",
    email: "c.berthier.formateur@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
  },
  {
    id: "u5",
    firstName: "Yanis",
    lastName: "Morel",
    email: "y.morel@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
  },
  {
    id: "u6",
    firstName: "Sophie",
    lastName: "Lemaire",
    email: "s.lemaire@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
  },
  {
    id: "u7",
    firstName: "Ibrahim",
    lastName: "Traoré",
    email: "i.traore@tpecsrpilot.fr",
    role: "formateur",
    access: "active",
    permissions: trainerPermissions(),
  },
  {
    id: "u8",
    firstName: "Sam",
    lastName: "Fokam",
    email: "s.fokam@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
  },
  {
    id: "u9",
    firstName: "Julie",
    lastName: "Moreau",
    email: "j.moreau@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
  },
  {
    id: "u10",
    firstName: "Marc",
    lastName: "Girard",
    email: "m.girard@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
  },
  {
    id: "u11",
    firstName: "Léa",
    lastName: "Perrin",
    email: "l.perrin@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
  },
  {
    id: "u12",
    firstName: "Karim",
    lastName: "Benali",
    email: "k.benali@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "active",
    permissions: studentPermissions(),
  },
  {
    id: "u13",
    firstName: "Thomas",
    lastName: "Roussel",
    email: "t.roussel@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "invited",
    permissions: studentPermissions(),
  },
  {
    id: "u14",
    firstName: "Chloé",
    lastName: "Marchand",
    email: "c.marchand@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "invited",
    permissions: studentPermissions(),
  },
  {
    id: "u15",
    firstName: "Mehdi",
    lastName: "Amrani",
    email: "m.amrani@stagiaire.tpecsrpilot.fr",
    role: "stagiaire",
    access: "invited",
    permissions: studentPermissions(),
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
  },
];
