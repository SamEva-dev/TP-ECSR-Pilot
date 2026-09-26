export type SiteOperationalStatus = "active" | "attention" | "inactive";

export interface SiteProfile {
  id: string;
  apiId: string;
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
