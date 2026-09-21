import { TRAINING_REFERENTIALS } from "./referentials.mock";
import {
  ORGANIZATIONS,
  PROGRAM_OFFERINGS,
  TRAINING_PROGRAMS,
  TRAINING_SITES,
  WORKSPACE_COHORTS,
} from "./workspace.mock";
import type { WorkspaceCohort } from "../models/workspace.models";

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

interface CohortOperationalMetrics {
  manager: string;
  completedHours?: number;
  catchupHours?: number;
  attendanceRate?: number;
  averageProgress?: number;
  exam?: ContextualPromotionExam;
}

const OPERATIONAL_METRICS: Record<string, CohortOperationalMetrics> = {
  p1: {
    manager: "Claire Berthier",
    completedHours: 5699,
    catchupHours: 60,
    attendanceRate: 96,
    averageProgress: 69,
    exam: { scheduled: "Février 2027", ready: 6 },
  },
  p2: {
    manager: "Claire Berthier",
    completedHours: 21840,
    catchupHours: 0,
    attendanceRate: 95,
    averageProgress: 100,
    exam: {
      presented: 23,
      graduated: 21,
      partial: 1,
      failed: 1,
      absent: 1,
      successRate: 91.3,
    },
  },
  "cohort-mrs-ecsr-2026": {
    manager: "Sophie Lemaire",
    completedHours: 9824,
    catchupHours: 84,
    attendanceRate: 94,
    averageProgress: 66,
    exam: { scheduled: "Mars 2027", ready: 9 },
  },
  "cohort-tls-ecsr-2026": {
    manager: "Yanis Morel",
    completedHours: 10710,
    catchupHours: 51,
    attendanceRate: 97,
    averageProgress: 71,
    exam: { scheduled: "Avril 2027", ready: 11 },
  },
  "cohort-ecf-nice-ecsr-2026": {
    manager: "Sonia Martin",
    completedHours: 8735,
    catchupHours: 42,
    attendanceRate: 95,
    averageProgress: 68,
    exam: { scheduled: "Mars 2027", ready: 8 },
  },
  "cohort-ecf-cannes-ecsr-2026": {
    manager: "David Lopez",
    completedHours: 7182,
    catchupHours: 35,
    attendanceRate: 96,
    averageProgress: 64,
    exam: { scheduled: "Avril 2027", ready: 6 },
  },
  "cohort-horizon-ecsr-2026": {
    manager: "Amélie Robert",
    completedHours: 4680,
    catchupHours: 21,
    attendanceRate: 98,
    averageProgress: 62,
    exam: { scheduled: "Mai 2027", ready: 4 },
  },
};

const DEFAULT_MANAGERS: Record<string, string> = {
  "site-aftral-nice": "Claire Berthier",
  "site-aftral-marseille": "Sophie Lemaire",
  "site-aftral-toulouse": "Yanis Morel",
  "site-ecf-nice": "Sonia Martin",
  "site-ecf-cannes": "David Lopez",
  "site-horizon-nice": "Amélie Robert",
};

function plannedHoursFor(cohort: WorkspaceCohort): number {
  return TRAINING_REFERENTIALS.find((item) => item.id === cohort.referentialVersionId)?.totalHours ?? 0;
}

function buildPromotion(cohort: WorkspaceCohort): ContextualPromotionSummary {
  const offering = PROGRAM_OFFERINGS.find((item) => item.id === cohort.offeringId)!;
  const site = TRAINING_SITES.find((item) => item.id === offering.siteId)!;
  const organization = ORGANIZATIONS.find((item) => item.id === site.organizationId)!;
  const program = TRAINING_PROGRAMS.find((item) => item.id === offering.programId)!;
  const referential = TRAINING_REFERENTIALS.find((item) => item.id === cohort.referentialVersionId);
  const metrics = OPERATIONAL_METRICS[cohort.id];
  const plannedHoursPerStudent = plannedHoursFor(cohort);
  const totalPlannedHours = plannedHoursPerStudent * cohort.studentCount;
  const completedHours = metrics?.completedHours ?? 0;

  return {
    id: cohort.id,
    offeringId: cohort.offeringId,
    organizationId: organization.id,
    organizationName: organization.name,
    siteId: site.id,
    siteName: site.name,
    siteCity: site.city,
    programId: program.id,
    programName: program.name,
    programCode: program.code,
    programIcon: program.icon,
    referentialVersionId: cohort.referentialVersionId ?? "",
    referentialVersion: referential?.version ?? "—",
    referentialCode: referential?.code ?? "—",
    name: cohort.name,
    shortName: cohort.shortName,
    start: cohort.start,
    end: cohort.end,
    status: cohort.status,
    studentCount: cohort.studentCount,
    manager: metrics?.manager ?? DEFAULT_MANAGERS[site.id] ?? "—",
    plannedHours: totalPlannedHours,
    completedHours,
    remainingHours: Math.max(0, totalPlannedHours - completedHours),
    catchupHours: metrics?.catchupHours ?? 0,
    attendanceRate: metrics?.attendanceRate ?? 0,
    averageProgress: metrics?.averageProgress ?? 0,
    exam: metrics?.exam,
  };
}

export const CONTEXTUAL_PROMOTIONS: ContextualPromotionSummary[] = WORKSPACE_COHORTS.map(buildPromotion);

export function promotionsForSiteProgram(siteId: string, programId: string): ContextualPromotionSummary[] {
  return CONTEXTUAL_PROMOTIONS.filter((item) => item.siteId === siteId && item.programId === programId);
}
