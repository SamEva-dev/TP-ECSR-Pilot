// API-backed report view contracts. No runtime demo data lives here.

import type { StudentStatus } from "./app.models";

export interface AuditLogItem {
  id: string;
  dateTime: string;
  author: string;
  actionKey: string;
  oldValue: string;
  newValue: string;
  reasonKey: string;
}

export interface ReportPromotionOption {
  id: string;
  apiId: string;
  name: string;
}

export interface ReportStudentRow {
  id: string;
  firstName: string;
  lastName: string;
  progress: number;
  completedHours: number;
  plannedHours: number;
  catchupHours: number;
  validatedSheets: number;
  totalSheets: number;
  status: StudentStatus;
}
