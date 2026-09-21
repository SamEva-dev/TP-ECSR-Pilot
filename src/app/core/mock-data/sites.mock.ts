export type SiteOperationalStatus = "active" | "attention" | "inactive";

export interface SiteProfile {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;
  status: SiteOperationalStatus;
  students: number;
  trainers: number;
  programs: number;
  activeCohorts: number;
  attendanceRate: number;
  successRate: number;
  rooms: number;
  vehicles: number;
  alerts: number;
}

export interface SiteProgramMetric {
  siteId: string;
  programId: string;
  students: number;
  trainers: number;
  activeCohorts: number;
  attendanceRate: number;
  successRate: number;
}

export interface SiteAlertItem {
  id: string;
  siteId: string;
  level: "danger" | "warning" | "info";
  titleKey: string;
  detailKey: string;
}

export interface SiteFormValue {
  code: string;
  name: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  manager: string;
  status: SiteOperationalStatus;
}

export const SITE_PROFILES: SiteProfile[] = [
  {
    id: "site-aftral-nice",
    organizationId: "org-aftral",
    code: "NCE",
    name: "AFTRAL Nice",
    city: "Nice",
    address: "12 boulevard René Cassin",
    postalCode: "06200",
    phone: "+33 4 93 00 12 40",
    email: "nice@aftral-demo.fr",
    manager: "Sophie Laurent",
    status: "active",
    students: 54,
    trainers: 14,
    programs: 4,
    activeCohorts: 4,
    attendanceRate: 96,
    successRate: 93,
    rooms: 8,
    vehicles: 17,
    alerts: 2,
  },
  {
    id: "site-aftral-marseille",
    organizationId: "org-aftral",
    code: "MRS",
    name: "AFTRAL Marseille",
    city: "Marseille",
    address: "145 avenue de Saint-Menet",
    postalCode: "13011",
    phone: "+33 4 91 45 28 10",
    email: "marseille@aftral-demo.fr",
    manager: "Nicolas Bernard",
    status: "attention",
    students: 43,
    trainers: 10,
    programs: 3,
    activeCohorts: 3,
    attendanceRate: 93,
    successRate: 88,
    rooms: 6,
    vehicles: 14,
    alerts: 4,
  },
  {
    id: "site-aftral-toulouse",
    organizationId: "org-aftral",
    code: "TLS",
    name: "AFTRAL Toulouse",
    city: "Toulouse",
    address: "72 rue Edmond Rostand",
    postalCode: "31200",
    phone: "+33 5 61 47 22 90",
    email: "toulouse@aftral-demo.fr",
    manager: "Claire Masson",
    status: "active",
    students: 28,
    trainers: 7,
    programs: 2,
    activeCohorts: 2,
    attendanceRate: 94,
    successRate: 91,
    rooms: 5,
    vehicles: 9,
    alerts: 1,
  },
  {
    id: "site-ecf-nice",
    organizationId: "org-ecf",
    code: "ECF-NCE",
    name: "ECF Nice",
    city: "Nice",
    address: "8 avenue des Arènes de Cimiez",
    postalCode: "06000",
    phone: "+33 4 93 81 26 40",
    email: "nice@ecf-demo.fr",
    manager: "Laurent Vidal",
    status: "active",
    students: 37,
    trainers: 10,
    programs: 2,
    activeCohorts: 3,
    attendanceRate: 96,
    successRate: 92,
    rooms: 5,
    vehicles: 11,
    alerts: 1,
  },
  {
    id: "site-ecf-cannes",
    organizationId: "org-ecf",
    code: "ECF-CAN",
    name: "ECF Cannes",
    city: "Cannes",
    address: "24 boulevard Carnot",
    postalCode: "06400",
    phone: "+33 4 92 98 11 30",
    email: "cannes@ecf-demo.fr",
    manager: "Élodie Perrin",
    status: "active",
    students: 25,
    trainers: 7,
    programs: 1,
    activeCohorts: 2,
    attendanceRate: 94,
    successRate: 90,
    rooms: 4,
    vehicles: 8,
    alerts: 2,
  },
  {
    id: "site-horizon-nice",
    organizationId: "org-horizon",
    code: "HZ-NCE",
    name: "Horizon Nice",
    city: "Nice",
    address: "31 avenue Jean Médecin",
    postalCode: "06000",
    phone: "+33 4 93 16 44 80",
    email: "contact@horizon-demo.fr",
    manager: "Patrick Roux",
    status: "active",
    students: 18,
    trainers: 6,
    programs: 1,
    activeCohorts: 2,
    attendanceRate: 96,
    successRate: 88,
    rooms: 3,
    vehicles: 6,
    alerts: 1,
  },
];

export const SITE_PROGRAM_METRICS: SiteProgramMetric[] = [
  { siteId: "site-aftral-nice", programId: "program-ecsr", students: 18, trainers: 6, activeCohorts: 1, attendanceRate: 97, successRate: 94 },
  { siteId: "site-aftral-nice", programId: "program-moto", students: 14, trainers: 4, activeCohorts: 1, attendanceRate: 96, successRate: 95 },
  { siteId: "site-aftral-nice", programId: "program-pl", students: 12, trainers: 3, activeCohorts: 1, attendanceRate: 94, successRate: 90 },
  { siteId: "site-aftral-nice", programId: "program-bus", students: 10, trainers: 3, activeCohorts: 1, attendanceRate: 95, successRate: 89 },
  { siteId: "site-aftral-marseille", programId: "program-ecsr", students: 16, trainers: 5, activeCohorts: 1, attendanceRate: 94, successRate: 90 },
  { siteId: "site-aftral-marseille", programId: "program-moto", students: 12, trainers: 3, activeCohorts: 1, attendanceRate: 93, successRate: 91 },
  { siteId: "site-aftral-marseille", programId: "program-pl", students: 15, trainers: 4, activeCohorts: 1, attendanceRate: 91, successRate: 84 },
  { siteId: "site-aftral-toulouse", programId: "program-ecsr", students: 17, trainers: 4, activeCohorts: 1, attendanceRate: 95, successRate: 92 },
  { siteId: "site-aftral-toulouse", programId: "program-bus", students: 11, trainers: 3, activeCohorts: 1, attendanceRate: 93, successRate: 90 },
  { siteId: "site-ecf-nice", programId: "program-ecsr", students: 22, trainers: 6, activeCohorts: 2, attendanceRate: 97, successRate: 93 },
  { siteId: "site-ecf-nice", programId: "program-moto", students: 15, trainers: 4, activeCohorts: 1, attendanceRate: 94, successRate: 90 },
  { siteId: "site-ecf-cannes", programId: "program-ecsr", students: 25, trainers: 7, activeCohorts: 2, attendanceRate: 94, successRate: 90 },
  { siteId: "site-horizon-nice", programId: "program-ecsr", students: 18, trainers: 6, activeCohorts: 2, attendanceRate: 96, successRate: 88 },
];

export const SITE_ALERTS: SiteAlertItem[] = [
  { id: "sa1", siteId: "site-aftral-nice", level: "warning", titleKey: "sites.detail.alerts.documents.title", detailKey: "sites.detail.alerts.documents.detail" },
  { id: "sa2", siteId: "site-aftral-nice", level: "info", titleKey: "sites.detail.alerts.exam.title", detailKey: "sites.detail.alerts.exam.detail" },
  { id: "sa3", siteId: "site-aftral-marseille", level: "danger", titleKey: "sites.detail.alerts.catchup.title", detailKey: "sites.detail.alerts.catchup.detail" },
  { id: "sa4", siteId: "site-aftral-marseille", level: "warning", titleKey: "sites.detail.alerts.vehicles.title", detailKey: "sites.detail.alerts.vehicles.detail" },
  { id: "sa5", siteId: "site-aftral-toulouse", level: "info", titleKey: "sites.detail.alerts.capacity.title", detailKey: "sites.detail.alerts.capacity.detail" },
];
