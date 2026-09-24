// Extracted from the former mock-data contract. No runtime demo data lives here.
// This file contains TypeScript contracts only and is safe in API-only mode.

import type { WorkspaceCohort } from "./workspace.models";

export interface ContextualPromotionExam {
  scheduled?: string;
  ready?: number;
  presented?: number;
  graduated?: number;
  partial?: number;
  failed?: number;
  absent?: number;
  successRate?: number;
}

export interface ContextualPromotionSummary {
  id: string;
  offeringId: string;
  organizationId: string;
  organizationName: string;
  siteId: string;
  siteName: string;
  siteCity: string;
  programId: string;
  programName: string;
  programCode: string;
  programIcon: string;
  referentialVersionId: string;
  referentialVersion: string;
  referentialCode: string;
  name: string;
  shortName: string;
  start: string;
  end: string;
  status: WorkspaceCohort["status"];
  studentCount: number;
  manager: string;
  plannedHours: number;
  completedHours: number;
  remainingHours: number;
  catchupHours: number;
  attendanceRate: number;
  averageProgress: number;
  exam?: ContextualPromotionExam;
}
