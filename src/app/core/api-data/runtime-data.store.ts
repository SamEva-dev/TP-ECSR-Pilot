import { signal } from "@angular/core";
import type { AttentionMockItem } from "../models/attention.models";
import type { OrganizationPreference } from "../models/organization-administration.models";
import type {
  DistanceLiveSession,
  DistanceAsyncModule,
} from "../models/distance-learning.models";
import type { SuccessAnalyticsRecord } from "../models/success-analytics.models";
import type { SheetStatus } from "../models/sheets.models";
import type { SheetCategory } from "../models/sheet-catalog.models";
import type { StudentDetailTab } from "../models/student-detail.models";

/**
 * API projection cache used by legacy-shaped views while the templates are progressively normalized.
 *
 * IMPORTANT:
 * - this file contains no business seed/demo records;
 * - every business collection is hydrated from PedagoraPilot.Api/AuthGate;
 * - collections are reactive Proxies backed by one Angular signal.
 *
 * Reading any runtime array reads RUNTIME_DATA_REVISION. Angular therefore tracks
 * it from computed() and templates. Mutating/replacing a runtime array increments the
 * revision and refreshes every dependent OnPush screen.
 */
export const RUNTIME_DATA_REVISION = signal(0);
const runtimeArrays: unknown[][] = [];

const ARRAY_MUTATORS = new Set([
  "copyWithin",
  "fill",
  "pop",
  "push",
  "reverse",
  "shift",
  "sort",
  "splice",
  "unshift",
]);

function createRuntimeArray<T>(): T[] {
  const target: T[] = [];
  runtimeArrays.push(target);

  return new Proxy(target, {
    get(array, property, receiver) {
      RUNTIME_DATA_REVISION();
      const value = Reflect.get(array, property, receiver);

      if (
        typeof property === "string" &&
        ARRAY_MUTATORS.has(property) &&
        typeof value === "function"
      ) {
        return (...args: unknown[]) => {
          const result = Reflect.apply(
            value as (...items: unknown[]) => unknown,
            array,
            args,
          );
          RUNTIME_DATA_REVISION.update((revision) => revision + 1);
          return result;
        };
      }

      return value;
    },

    set(array, property, value, receiver) {
      const changed = Reflect.get(array, property, receiver) !== value;
      const result = Reflect.set(array, property, value, receiver);
      if (changed) {
        RUNTIME_DATA_REVISION.update((revision) => revision + 1);
      }
      return result;
    },
  });
}

/** Drop all cached tenant projections when the authenticated identity changes. */
export function clearRuntimeData(): void {
  for (const array of runtimeArrays) array.length = 0;
  (globalThis as any).__pedagoraCertificationSchemes = [];
  RUNTIME_DATA_REVISION.update((revision) => revision + 1);
}

export const ORGANIZATIONS: any[] = createRuntimeArray();
export const TRAINING_SITES: any[] = createRuntimeArray();
export const TRAINING_PROGRAMS: any[] = createRuntimeArray();
export const PROGRAM_OFFERINGS: any[] = createRuntimeArray();
export const WORKSPACE_COHORTS: any[] = createRuntimeArray();
export const PROGRAM_CATALOG: any[] = createRuntimeArray();
export const TRAINING_REFERENTIALS: any[] = createRuntimeArray();
export const CONTEXTUAL_PROMOTIONS: any[] = createRuntimeArray();
export const STUDENT_DIRECTORY: any[] = createRuntimeArray();
export const STUDENTS: any[] = STUDENT_DIRECTORY;
export const PROMOTIONS: any[] = WORKSPACE_COHORTS;
export const PLANNING_EVENTS: any[] = createRuntimeArray();
export const DRIVING_PROGRAMMED: any[] = createRuntimeArray();
export const PROGRAMMED_SESSIONS: any[] = createRuntimeArray();
export const ATTENDANCE_STUDENTS: any[] = createRuntimeArray();
export const INTERNSHIP_PERIODS: any[] = createRuntimeArray();
export const CERTIFICATION_CANDIDATES: any[] = createRuntimeArray();
export const EXAM_SESSIONS: any[] = createRuntimeArray();
export const DRIVING_HISTORY: any[] = createRuntimeArray();
export const DRIVING_OBSERVATIONS: any[] = DRIVING_HISTORY;
export const DEFAULT_SHEET_CATALOG: any[] = createRuntimeArray();
export const SKILL_DEFINITIONS: any[] = createRuntimeArray();
export const SKILL_LINKED_SESSIONS: any[] = createRuntimeArray();
export const DRIVING_COMPETENCIES: any[] = createRuntimeArray();
export const DRIVING_SUB_SKILLS: any[] = createRuntimeArray();
export const DRIVING_CRITERIA: any[] = createRuntimeArray();
export const DRIVING_TRAINERS: any[] = createRuntimeArray();
export const DRIVING_VEHICLES: any[] = createRuntimeArray();
export const SESSION_TRAINERS: any[] = createRuntimeArray();
export const PEDAGOGICAL_TEAM: any[] = createRuntimeArray();
export const ACCESS_ACCOUNTS: any[] = createRuntimeArray();
export const ATTENTION_MOCK_ITEMS: AttentionMockItem[] = createRuntimeArray();
export const ALERTS: any[] = createRuntimeArray();
export const PROMOTION_METRICS: any[] = createRuntimeArray();
export const TRAINER_AGENDA: any[] = createRuntimeArray();
export const SAM_TIMELINE: any[] = createRuntimeArray();
export const ORGANIZATION_ACTIVITY: any[] = createRuntimeArray();
export const ORGANIZATION_ALERTS: any[] = createRuntimeArray();
export const ORGANIZATION_KPIS: any[] = createRuntimeArray();
export const PROGRAM_PERFORMANCES: any[] = createRuntimeArray();
export const SITE_PERFORMANCES: any[] = createRuntimeArray();
export const SITE_ALERTS: any[] = createRuntimeArray();
export const SITE_PROGRAM_METRICS: any[] = createRuntimeArray();
export const ORGANIZATION_AUDIT: any[] = createRuntimeArray();
export const AUDIT_LOG: any[] = ORGANIZATION_AUDIT;
export const SUCCESS_ANALYTICS_RECORDS: SuccessAnalyticsRecord[] =
  createRuntimeArray();
export const CENTER_COMPETENCIES: any[] = createRuntimeArray();
export const CENTER_PROMOTIONS: any[] = createRuntimeArray();
export const CENTER_RANKING: any[] = createRuntimeArray();
export const CENTER_STATUSES: any[] = createRuntimeArray();
export const SECRETARIAT_PRIORITIES: any[] = createRuntimeArray();
export const STUDENT_COMPETENCIES: any[] = createRuntimeArray();
export const TRAINER_COMPETENCIES: any[] = createRuntimeArray();
export const TRAINER_STUDENTS: any[] = createRuntimeArray();
export const DISTANCE_LIVE_SESSIONS: DistanceLiveSession[] =
  createRuntimeArray();
export const DISTANCE_ASYNC_MODULES: DistanceAsyncModule[] =
  createRuntimeArray();
export const DISTANCE_INTERACTIONS: any[] = createRuntimeArray();
export const DISTANCE_RESOURCES: any[] = createRuntimeArray();
export const DISTANCE_SITE_METRICS: any[] = createRuntimeArray();
export const REMOTE_WORK_REQUESTS: any[] = createRuntimeArray();
export const REMOTE_WORK_ACTIVITIES: any[] = createRuntimeArray();
export const TEAM_WORK_MODE_WEEK: any[] = createRuntimeArray();

// UI vocabularies (not business/demo records).
export const PLANNING_DAYS = (
  ["monday", "tuesday", "wednesday", "thursday", "friday"] as const
).map((id) => ({ id, labelKey: `planning.days.${id}` }));
export const PROGRAM_MODULES = [
  "planning",
  "attendance",
  "sessions",
  "driving",
  "plateau",
  "sheets",
  "skills",
  "internships",
  "documents",
  "assessments",
  "certification",
  "statistics",
  "distanceLearning",
] as const;
export const ALL_SHEET_STATUSES: SheetStatus[] = [
  "not_started",
  "in_progress",
  "ready",
  "presented",
  "validated",
  "rework",
];
export const SHEET_CATEGORIES: SheetCategory[] = [
  "rules",
  "risk",
  "vehicle",
  "pedagogy",
  "exam",
  "mobility",
];
export const EVALUATION_CRITERIA: any[] = [];
export const EVALUATORS: any[] = [];
export const STUDENT_DETAIL_TABS: { id: StudentDetailTab; labelKey: string }[] =
  (
    [
      "overview",
      "hours",
      "driving",
      "skills",
      "sheets",
      "attendance",
      "internships",
      "evaluations",
      "documents",
      "certification",
      "history",
    ] as const
  ).map((id) => ({ id, labelKey: `studentDetail.tabs.${id}` }));
export const REMOTE_WORK_POLICY: any = {
  enabled: true,
  maxDaysPerWeek: 0,
  approvalRequired: true,
};
export const ORGANIZATION_MODULE_SETTINGS: any[] = [];
export const ORGANIZATION_PREFERENCES: OrganizationPreference[] = [];

export function replaceRuntimeArray(
  target: any[],
  values: readonly any[] | null | undefined,
): void {
  target.splice(0, target.length, ...(values ?? []));
}

export function workspaceAccessFor(session: any): any {
  if (!session) return { scope: "cohort", cohortIds: [], locked: true };
  return { scope: "platform", locked: false };
}

export function accessAccountForSession(session: any): any {
  if (!session) return null;
  return (
    ACCESS_ACCOUNTS.find(
      (item) => item.email?.toLowerCase() === session.email?.toLowerCase(),
    ) ?? null
  );
}

export function certificationSchemeForProgram(programId: string): any {
  return (
    (globalThis as any).__pedagoraCertificationSchemes?.find(
      (x: any) => x.programId === programId,
    ) ??
    (globalThis as any).__pedagoraCertificationSchemes?.[0] ?? {
      id: "",
      programId,
      units: [],
      steps: [],
      requiredDocuments: 0,
    }
  );
}
export function juryMembersForProgram(programId: string): any[] {
  return ACCESS_ACCOUNTS.filter(
    (x) =>
      (x.roles ?? []).some((r: string) => r.toLowerCase().includes("jury")) &&
      (!x.programIds || x.programIds.includes(programId)),
  );
}
export function sheetsFor(studentId: string): any[] {
  return DEFAULT_SHEET_CATALOG.filter(
    (x) => !x.studentId || x.studentId === studentId,
  );
}
export function reworkCountFor(studentId: string): number {
  return sheetsFor(studentId).filter((x) => x.status === "rework").length;
}
export function certificationCandidateByStudentId(studentId: string): any {
  return (
    CERTIFICATION_CANDIDATES.find((x) => x.studentId === studentId) ?? null
  );
}
export function studentDetailById(id: string): any {
  return STUDENT_DIRECTORY.find((x) => x.id === id) ?? null;
}
export function studentDrivingHistory(id: string): any[] {
  return DRIVING_HISTORY.filter((x) => x.studentId === id);
}
export function studentInternships(id: string): any[] {
  return INTERNSHIP_PERIODS.filter((x) => x.studentId === id);
}
export function studentSheets(id: string): any[] {
  return DEFAULT_SHEET_CATALOG.filter(
    (x) => !x.studentId || x.studentId === id,
  );
}
export function studentAuditHistory(id: string): any[] {
  return ORGANIZATION_AUDIT.filter(
    (x) => x.entityId === id || x.studentId === id,
  );
}
export function organizationProfileFor(id: string): any {
  return ORGANIZATIONS.find((x) => x.id === id) ?? null;
}
export function organizationBrandingFor(id: string): any {
  const o = organizationProfileFor(id);
  return {
    organizationId: id,
    primaryColor: o?.primaryColor ?? "#1d497d",
    secondaryColor: o?.secondaryColor ?? "#f8a11a",
    logoUrl: null,
    loginTagline: "",
  };
}
export function organizationMetricsFor(id: string): any {
  return (
    ORGANIZATION_KPIS.find((x) => x.organizationId === id) ?? {
      sites: 0,
      programs: 0,
      cohorts: 0,
      students: 0,
      trainers: 0,
      attendanceRate: 0,
      successRate: 0,
    }
  );
}
