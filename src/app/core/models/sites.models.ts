// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

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
