export interface OrganizationDashboard {
  organizationId: string;
  sites: number;
  activePrograms: number;
  activeCohorts: number;
  learners: number;
  attendanceRate: number;
  averageProgressRate: number;
  certificationSuccessRate: number;
  openAlerts: number;
}

export interface SiteDashboard {
  siteId: string;
  siteName: string;
  activeCohorts: number;
  learners: number;
  attendanceRate: number;
  averageProgressRate: number;
  certificationSuccessRate: number;
}

export interface CohortDashboard {
  cohortId: string;
  cohortCode: string;
  cohortName: string;
  learners: number;
  plannedMinutes: number;
  deliveredMinutes: number;
  presentMinutes: number;
  attendanceRate: number;
  averageCompetencyProgress: number;
  workplacePeriodsCompleted: number;
  certificationEligible: number;
  certificationObtained: number;
  openAlerts: number;
}

export interface ReportingTrendPoint {
  date: string;
  value: number;
}

export interface AuditEntry {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  userDisplayName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  route?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
  ipAddress?: string | null;
  occurredAtUtc: string;
}

export interface PagedAudit {
  items: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
}
