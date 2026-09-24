// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

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
