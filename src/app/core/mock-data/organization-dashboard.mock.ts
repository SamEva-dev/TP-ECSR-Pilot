export interface OrganizationKpis {
  organizationId: string;
  sites: number;
  activePrograms: number;
  students: number;
  trainers: number;
  activeCohorts: number;
  successRate: number;
  attendanceRate: number;
  completedHours: number;
}

export interface SitePerformance {
  organizationId: string;
  siteId: string;
  siteName: string;
  city: string;
  students: number;
  trainers: number;
  programs: number;
  activeCohorts: number;
  attendanceRate: number;
  successRate: number;
  alerts: number;
}

export interface ProgramPerformance {
  organizationId: string;
  programId: string;
  programName: string;
  code: string;
  students: number;
  activeCohorts: number;
  attendanceRate: number;
  successRate: number;
  icon: string;
}

export interface OrganizationAlert {
  id: string;
  organizationId: string;
  level: "danger" | "warning" | "info";
  titleKey: string;
  detailKey: string;
}

export interface OrganizationActivity {
  id: string;
  organizationId: string;
  icon: string;
  titleKey: string;
  detailKey: string;
  whenKey: string;
}

export const ORGANIZATION_KPIS: OrganizationKpis[] = [
  {
    organizationId: "org-aftral",
    sites: 3,
    activePrograms: 4,
    students: 125,
    trainers: 31,
    activeCohorts: 9,
    successRate: 89,
    attendanceRate: 94,
    completedHours: 184250,
  },
  {
    organizationId: "org-ecf",
    sites: 2,
    activePrograms: 2,
    students: 62,
    trainers: 17,
    activeCohorts: 5,
    successRate: 91,
    attendanceRate: 95,
    completedHours: 82640,
  },
  {
    organizationId: "org-horizon",
    sites: 1,
    activePrograms: 1,
    students: 18,
    trainers: 6,
    activeCohorts: 2,
    successRate: 88,
    attendanceRate: 96,
    completedHours: 24180,
  },
];

export const SITE_PERFORMANCES: SitePerformance[] = [
  { organizationId: "org-aftral", siteId: "site-aftral-nice", siteName: "AFTRAL Nice", city: "Nice", students: 54, trainers: 14, programs: 4, activeCohorts: 4, attendanceRate: 96, successRate: 93, alerts: 2 },
  { organizationId: "org-aftral", siteId: "site-aftral-marseille", siteName: "AFTRAL Marseille", city: "Marseille", students: 43, trainers: 10, programs: 3, activeCohorts: 3, attendanceRate: 93, successRate: 88, alerts: 4 },
  { organizationId: "org-aftral", siteId: "site-aftral-toulouse", siteName: "AFTRAL Toulouse", city: "Toulouse", students: 28, trainers: 7, programs: 2, activeCohorts: 2, attendanceRate: 94, successRate: 91, alerts: 1 },
  { organizationId: "org-ecf", siteId: "site-ecf-nice", siteName: "ECF Nice", city: "Nice", students: 37, trainers: 10, programs: 2, activeCohorts: 3, attendanceRate: 96, successRate: 92, alerts: 1 },
  { organizationId: "org-ecf", siteId: "site-ecf-cannes", siteName: "ECF Cannes", city: "Cannes", students: 25, trainers: 7, programs: 1, activeCohorts: 2, attendanceRate: 94, successRate: 90, alerts: 2 },
  { organizationId: "org-horizon", siteId: "site-horizon-nice", siteName: "Horizon Nice", city: "Nice", students: 18, trainers: 6, programs: 1, activeCohorts: 2, attendanceRate: 96, successRate: 88, alerts: 1 },
];

export const PROGRAM_PERFORMANCES: ProgramPerformance[] = [
  { organizationId: "org-aftral", programId: "program-ecsr", programName: "TP ECSR", code: "ECSR", students: 51, activeCohorts: 3, attendanceRate: 96, successRate: 91, icon: "ph-steering-wheel" },
  { organizationId: "org-aftral", programId: "program-moto", programName: "Formation Moto", code: "MOTO", students: 26, activeCohorts: 2, attendanceRate: 95, successRate: 94, icon: "ph-motorcycle" },
  { organizationId: "org-aftral", programId: "program-pl", programName: "Poids lourd", code: "PL", students: 27, activeCohorts: 2, attendanceRate: 92, successRate: 88, icon: "ph-truck" },
  { organizationId: "org-aftral", programId: "program-bus", programName: "Transport voyageurs / Bus", code: "BUS", students: 21, activeCohorts: 2, attendanceRate: 93, successRate: 87, icon: "ph-bus" },
  { organizationId: "org-ecf", programId: "program-ecsr", programName: "TP ECSR", code: "ECSR", students: 40, activeCohorts: 3, attendanceRate: 96, successRate: 92, icon: "ph-steering-wheel" },
  { organizationId: "org-ecf", programId: "program-moto", programName: "Formation Moto", code: "MOTO", students: 22, activeCohorts: 2, attendanceRate: 94, successRate: 89, icon: "ph-motorcycle" },
  { organizationId: "org-horizon", programId: "program-ecsr", programName: "TP ECSR", code: "ECSR", students: 18, activeCohorts: 2, attendanceRate: 96, successRate: 88, icon: "ph-steering-wheel" },
];

export const ORGANIZATION_ALERTS: OrganizationAlert[] = [
  { id: "oa1", organizationId: "org-aftral", level: "danger", titleKey: "organizationDashboard.alerts.catchup.title", detailKey: "organizationDashboard.alerts.catchup.detail" },
  { id: "oa2", organizationId: "org-aftral", level: "warning", titleKey: "organizationDashboard.alerts.documents.title", detailKey: "organizationDashboard.alerts.documents.detail" },
  { id: "oa3", organizationId: "org-aftral", level: "warning", titleKey: "organizationDashboard.alerts.certification.title", detailKey: "organizationDashboard.alerts.certification.detail" },
  { id: "oa4", organizationId: "org-aftral", level: "info", titleKey: "organizationDashboard.alerts.capacity.title", detailKey: "organizationDashboard.alerts.capacity.detail" },
  { id: "oa5", organizationId: "org-ecf", level: "warning", titleKey: "organizationDashboard.alerts.ecf.title", detailKey: "organizationDashboard.alerts.ecf.detail" },
  { id: "oa6", organizationId: "org-horizon", level: "info", titleKey: "organizationDashboard.alerts.horizon.title", detailKey: "organizationDashboard.alerts.horizon.detail" },
];

export const ORGANIZATION_ACTIVITY: OrganizationActivity[] = [
  { id: "act1", organizationId: "org-aftral", icon: "ph-graduation-cap", titleKey: "organizationDashboard.activity.item1.title", detailKey: "organizationDashboard.activity.item1.detail", whenKey: "organizationDashboard.activity.item1.when" },
  { id: "act2", organizationId: "org-aftral", icon: "ph-certificate", titleKey: "organizationDashboard.activity.item2.title", detailKey: "organizationDashboard.activity.item2.detail", whenKey: "organizationDashboard.activity.item2.when" },
  { id: "act3", organizationId: "org-aftral", icon: "ph-users-three", titleKey: "organizationDashboard.activity.item3.title", detailKey: "organizationDashboard.activity.item3.detail", whenKey: "organizationDashboard.activity.item3.when" },
  { id: "act4", organizationId: "org-aftral", icon: "ph-buildings", titleKey: "organizationDashboard.activity.item4.title", detailKey: "organizationDashboard.activity.item4.detail", whenKey: "organizationDashboard.activity.item4.when" },
  { id: "act5", organizationId: "org-ecf", icon: "ph-graduation-cap", titleKey: "organizationDashboard.activity.ecf.title", detailKey: "organizationDashboard.activity.ecf.detail", whenKey: "organizationDashboard.activity.ecf.when" },
  { id: "act6", organizationId: "org-horizon", icon: "ph-certificate", titleKey: "organizationDashboard.activity.horizon.title", detailKey: "organizationDashboard.activity.horizon.detail", whenKey: "organizationDashboard.activity.horizon.when" },
];
