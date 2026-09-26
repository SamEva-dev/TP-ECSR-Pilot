import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type {
  StatisticsCompetencyRow,
  StatisticsPromotionRow,
  StatisticsRankingRow,
  StatisticsStatusRow,
} from "../models/statistics.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import {
  type CohortDashboard,
  type CohortLearnerDashboard,
} from "../reporting/reporting.models";
import { ReportingApiService } from "../reporting/reporting-api.service";
import { SessionService } from "../session/session.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import { TrainingSessionApiStoreService } from "./training-session-api-store.service";

interface CohortContextRow {
  id: string;
  apiId: string;
  name: string;
}

interface CohortStatisticsBundle {
  cohort: CohortContextRow;
  dashboard: CohortDashboard | null;
  learners: CohortLearnerDashboard[];
}

export interface StatisticsSheetSummary {
  prepared: number;
  presented: number;
  validated: number;
  rework: number;
  progress: number;
}

export interface StatisticsPriorityRow {
  name: string;
  detailKey: string;
  value: number;
}

export interface StatisticsStudentHourRow {
  k: "classroom" | "driving" | "internship";
  v: number;
  p: number;
}

const EMPTY_SHEETS: StatisticsSheetSummary = {
  prepared: 0,
  presented: 0,
  validated: 0,
  rework: 0,
  progress: 0,
};

@Injectable({ providedIn: "root" })
export class StatisticsApiStoreService {
  private readonly reporting = inject(ReportingApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly sessions = inject(TrainingSessionApiStoreService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);

  private readonly bundlesSignal = signal<CohortStatisticsBundle[]>([]);
  private readonly studentSignal = signal<CohortLearnerDashboard | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  readonly centerPromotions = computed<StatisticsPromotionRow[]>(() =>
    this.bundlesSignal().map((bundle) => ({
      id: this.text(bundle.cohort.id),
      name: this.text(bundle.cohort.name),
      progress: this.average(bundle.learners.map((learner) => this.number(learner.averageCompetencyProgress))),
      completedHours: this.hours(bundle.learners.reduce((sum, learner) => sum + this.number(learner.completedMinutes), 0)),
      plannedHours: this.hours(bundle.learners.reduce((sum, learner) => sum + this.number(learner.plannedMinutes), 0)),
      attendance: this.number(bundle.dashboard?.attendanceRate),
      catchupHours: this.hours(bundle.learners.reduce((sum, learner) => sum + this.number(learner.catchupMinutes), 0)),
    })),
  );

  private readonly allLearners = computed(() => this.bundlesSignal().flatMap((bundle) => bundle.learners));

  readonly centerCompetencies = computed(() => this.competencies(this.allLearners()));
  readonly centerRanking = computed(() => this.ranking(this.allLearners()));
  readonly centerStatuses = computed(() => this.statusRows(this.allLearners()));
  readonly centerSheets = computed(() => this.sheetSummary(this.allLearners()));
  readonly directionAverageProgress = computed(() => this.average(this.allLearners().map((row) => this.number(row.averageCompetencyProgress))));
  readonly directionAttendance = computed(() => this.attendance(this.allLearners()));
  readonly directionCompletedHours = computed(() => this.hours(this.allLearners().reduce((sum, row) => sum + this.number(row.completedMinutes), 0)));
  readonly directionCatchupHours = computed(() => this.hours(this.allLearners().reduce((sum, row) => sum + this.number(row.catchupMinutes), 0)));

  private readonly selectedLearners = computed(() => {
    const selectedApiId = this.text(this.workspace.cohort()?.apiId);
    return this.bundlesSignal().find((bundle) => bundle.cohort.apiId === selectedApiId)?.learners ?? [];
  });

  private readonly trainerSessions = computed(() => {
    const current = this.session.session();
    const userId = this.text(current?.userId).toLowerCase();
    const displayName = [this.text(current?.firstName), this.text(current?.lastName)].filter(Boolean).join(" ").trim().toLowerCase();
    return this.sessions.apiSessions().filter((row) => {
      const trainerId = this.text(row.trainerAuthGateUserId).toLowerCase();
      const trainerName = this.text(row.trainerDisplayName).trim().toLowerCase();
      if (trainerId) return !!userId && trainerId === userId;
      return !!displayName && trainerName === displayName;
    });
  });

  readonly trainerLearners = computed(() => {
    const learners = this.selectedLearners();
    const sessions = this.trainerSessions();
    if (!sessions.length) return [];
    if (sessions.some((row) => row.audienceMode === "whole-cohort")) return learners;
    const allowed = new Set(sessions.flatMap((row) => Array.isArray(row.participantEnrollmentIds) ? row.participantEnrollmentIds : []));
    return learners.filter((row) => allowed.has(this.text(row.enrollmentId)));
  });

  readonly trainerStudents = computed(() => this.ranking(this.trainerLearners()));
  readonly trainerCompetencies = computed(() => this.competencies(this.trainerLearners()));
  readonly trainerSheets = computed(() => this.sheetSummary(this.trainerLearners()));
  readonly trainerStatuses = computed(() => this.statusRows(this.trainerLearners()));
  readonly trainerAverageProgress = computed(() => this.average(this.trainerLearners().map((row) => this.number(row.averageCompetencyProgress))));
  readonly trainerAttendance = computed(() => {
    const rows = this.trainerSessions();
    const expected = rows.reduce((sum, row) => sum + this.number(row.expectedLearners), 0);
    const present = rows.reduce((sum, row) => sum + this.number(row.presentLearners), 0);
    return expected > 0 ? this.percent(present, expected) : 0;
  });
  readonly trainerSessionCount = computed(() => this.trainerSessions().length);
  readonly trainerStudentCount = computed(() => this.trainerLearners().length);

  readonly secretariatPriorities = computed<StatisticsPriorityRow[]>(() =>
    this.allLearners()
      .filter((row) => this.number(row.catchupMinutes) > 0 || this.number(row.absentCount) > 0)
      .sort((a, b) => {
        const catchup = this.number(b.catchupMinutes) - this.number(a.catchupMinutes);
        return catchup !== 0 ? catchup : this.number(b.absentCount) - this.number(a.absentCount);
      })
      .slice(0, 4)
      .map((row) => {
        const catchup = this.number(row.catchupMinutes);
        return {
          name: [this.text(row.firstName), this.text(row.lastName)].filter(Boolean).join(" ").trim(),
          detailKey: catchup > 0 ? "statistics.secretariat.priorities.catchup" : "statistics.secretariat.priorities.absence",
          value: catchup > 0 ? this.hours(catchup) : this.number(row.absentCount),
        };
      }),
  );
  readonly secretariatToRegularize = computed(() => this.allLearners().filter((row) => this.number(row.catchupMinutes) > 0 || this.number(row.absentCount) > 0).length);

  readonly student = this.studentSignal.asReadonly();
  readonly studentCompetencies = computed(() => this.competencies(this.studentSignal() ? [this.studentSignal()!] : []));
  readonly studentSheets = computed(() => this.sheetSummary(this.studentSignal() ? [this.studentSignal()!] : []));
  readonly studentHours = computed<StatisticsStudentHourRow[]>(() => {
    const row = this.studentSignal();
    const values = [
      { k: "classroom" as const, v: this.hours(row?.classroomMinutes) },
      { k: "driving" as const, v: this.hours(row?.drivingMinutes) },
      { k: "internship" as const, v: this.hours(row?.internshipMinutes) },
    ];
    const total = values.reduce((sum, item) => sum + item.v, 0);
    return values.map((item) => ({ ...item, p: total > 0 ? this.percent(item.v, total) : 0 }));
  });

  readonly studentProgress = computed(() => this.number(this.studentSignal()?.averageCompetencyProgress));
  readonly studentAttendance = computed(() => this.number(this.studentSignal()?.attendanceRate));
  readonly studentCompletedHours = computed(() => this.hours(this.studentSignal()?.completedMinutes));
  readonly studentPlannedHours = computed(() => this.hours(this.studentSignal()?.plannedMinutes));
  readonly studentCatchupHours = computed(() => this.hours(this.studentSignal()?.catchupMinutes));
  readonly studentPresentCount = computed(() => this.number(this.studentSignal()?.presentCount));
  readonly studentLateCount = computed(() => this.number(this.studentSignal()?.lateCount));
  readonly studentAbsentCount = computed(() => this.number(this.studentSignal()?.absentCount));
  readonly studentExcusedCount = computed(() => this.number(this.studentSignal()?.excusedCount));

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const role = this.session.role();
      const cohortRows = this.workspace.cohorts().map((cohort) => ({
        id: this.text(cohort.id),
        apiId: this.text(cohort.apiId),
        name: this.text(cohort.name),
      })).filter((cohort) => cohort.apiId);
      const selectedApiId = this.text(this.workspace.cohort()?.apiId);
      const generation = ++this.generation;
      this.resetDataOnly();
      this.loadError.set(false);
      if (!ready) return;
      if (role === "stagiaire") {
        if (selectedApiId) void this.loadStudent(generation, selectedApiId);
      } else {
        void this.loadStaff(generation, cohortRows);
      }
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.(training|learning|workplace|certification)\./.test(event.typeKey)) return;
      untracked(() => void this.reload());
    });
  }

  async reload(): Promise<boolean> {
    const generation = ++this.generation;
    const role = this.session.role();
    this.resetDataOnly();
    this.loadError.set(false);
    if (role === "stagiaire") {
      const cohortApiId = this.text(this.workspace.cohort()?.apiId);
      return cohortApiId ? this.loadStudent(generation, cohortApiId) : true;
    }
    const cohorts = this.workspace.cohorts().map((cohort) => ({
      id: this.text(cohort.id),
      apiId: this.text(cohort.apiId),
      name: this.text(cohort.name),
    })).filter((cohort) => cohort.apiId);
    return this.loadStaff(generation, cohorts);
  }

  private async loadStaff(generation: number, cohorts: CohortContextRow[]): Promise<boolean> {
    if (!cohorts.length) {
      this.bundlesSignal.set([]);
      return true;
    }
    const request = ++this.request;
    this.loading.set(true);
    try {
      const bundles = await Promise.all(cohorts.map(async (cohort) => {
        const [dashboard, learners] = await Promise.allSettled([
          firstValueFrom(this.reporting.cohortDashboard(cohort.apiId)),
          firstValueFrom(this.reporting.cohortLearners(cohort.apiId)),
        ]);
        return {
          cohort,
          dashboard: dashboard.status === "fulfilled" ? this.dashboard(dashboard.value) : null,
          learners: learners.status === "fulfilled" && Array.isArray(learners.value)
            ? learners.value.map((row) => this.learner(row))
            : [],
          failed: dashboard.status === "rejected" || learners.status === "rejected",
        };
      }));
      if (generation !== this.generation || request !== this.request) return false;
      const failed = bundles.some((bundle) => bundle.failed);
      this.bundlesSignal.set(bundles.map(({ cohort, dashboard, learners }) => ({ cohort, dashboard, learners })));
      this.loadError.set(failed);
      if (failed) this.notifications.error("statistics.real.partialError", "/statistiques");
      return !failed;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.resetDataOnly();
        this.loadError.set(true);
        this.notifications.error("statistics.real.partialError", "/statistiques");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  private async loadStudent(generation: number, cohortApiId: string): Promise<boolean> {
    const request = ++this.request;
    this.loading.set(true);
    try {
      const row = await firstValueFrom(this.reporting.myLearnerDashboard(cohortApiId));
      if (generation !== this.generation || request !== this.request) return false;
      this.studentSignal.set(this.learner(row));
      this.loadError.set(false);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.studentSignal.set(null);
        this.loadError.set(true);
        this.notifications.error("statistics.real.partialError", "/statistiques");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  private resetDataOnly(): void {
    this.bundlesSignal.set([]);
    this.studentSignal.set(null);
  }

  private competencies(rows: CohortLearnerDashboard[]): StatisticsCompetencyRow[] {
    return (["C1", "C2", "C3", "C4"] as const).map((code) => ({
      code,
      labelKey: `statistics.competencies.${code.toLowerCase()}`,
      value: this.average(rows.map((row) => this.number(row.competencies?.[code]))),
    }));
  }

  private ranking(rows: CohortLearnerDashboard[]): StatisticsRankingRow[] {
    return [...rows]
      .sort((a, b) => this.number(b.averageCompetencyProgress) - this.number(a.averageCompetencyProgress))
      .slice(0, 6)
      .map((row, index) => ({
        rank: index + 1,
        name: [this.text(row.firstName), this.text(row.lastName)].filter(Boolean).join(" ").trim(),
        progress: this.number(row.averageCompetencyProgress),
      }));
  }

  private statusRows(rows: CohortLearnerDashboard[]): StatisticsStatusRow[] {
    const keys: StatisticsStatusRow["key"][] = ["good", "warning", "late", "finished"];
    const counts = new Map<StatisticsStatusRow["key"], number>(keys.map((key) => [key, 0]));
    rows.forEach((row) => {
      const key = this.status(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return keys.map((key) => {
      const count = counts.get(key) ?? 0;
      return { key, count, value: rows.length ? this.percent(count, rows.length) : 0 };
    });
  }

  private status(row: CohortLearnerDashboard): StatisticsStatusRow["key"] {
    const enrollment = this.text(row.enrollmentStatus).toLowerCase();
    if (enrollment === "completed") return "finished";
    if (this.number(row.catchupMinutes) > 0 || this.number(row.absentCount) > 0) return "late";
    if (enrollment && enrollment !== "active") return "warning";
    return "good";
  }

  private sheetSummary(rows: CohortLearnerDashboard[]): StatisticsSheetSummary {
    if (!rows.length) return { ...EMPTY_SHEETS };
    const prepared = rows.reduce((sum, row) => sum + this.number(row.preparedTopics), 0);
    const presented = rows.reduce((sum, row) => sum + this.number(row.presentedTopics), 0);
    const validated = rows.reduce((sum, row) => sum + this.number(row.validatedTopics), 0);
    const rework = rows.reduce((sum, row) => sum + this.number(row.reworkTopics), 0);
    const total = rows.reduce((sum, row) => sum + this.number(row.totalTopics), 0);
    return { prepared, presented, validated, rework, progress: total > 0 ? this.percent(prepared, total) : 0 };
  }

  private attendance(rows: CohortLearnerDashboard[]): number {
    const expected = rows.reduce((sum, row) => sum + this.number(row.attendanceExpectedMinutes), 0);
    const present = rows.reduce((sum, row) => sum + this.number(row.attendancePresentMinutes), 0);
    return expected > 0 ? this.percent(present, expected) : 0;
  }

  private learner(row: CohortLearnerDashboard): CohortLearnerDashboard {
    const competencies = row?.competencies && typeof row.competencies === "object"
      ? Object.fromEntries(Object.entries(row.competencies).map(([key, value]) => [this.text(key).toUpperCase(), this.number(value)]))
      : {};
    return {
      enrollmentId: this.text(row?.enrollmentId),
      learnerProfileId: this.text(row?.learnerProfileId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      enrollmentStatus: this.text(row?.enrollmentStatus),
      plannedMinutes: this.number(row?.plannedMinutes),
      completedMinutes: this.number(row?.completedMinutes),
      catchupMinutes: this.number(row?.catchupMinutes),
      preparedTopics: this.number(row?.preparedTopics),
      presentedTopics: this.number(row?.presentedTopics),
      validatedTopics: this.number(row?.validatedTopics),
      reworkTopics: this.number(row?.reworkTopics),
      totalTopics: this.number(row?.totalTopics),
      averageCompetencyProgress: this.number(row?.averageCompetencyProgress),
      competencies,
      attendanceExpectedMinutes: this.number(row?.attendanceExpectedMinutes),
      attendancePresentMinutes: this.number(row?.attendancePresentMinutes),
      attendanceRate: this.number(row?.attendanceRate),
      presentCount: this.number(row?.presentCount),
      lateCount: this.number(row?.lateCount),
      absentCount: this.number(row?.absentCount),
      excusedCount: this.number(row?.excusedCount),
      classroomMinutes: this.number(row?.classroomMinutes),
      drivingMinutes: this.number(row?.drivingMinutes),
      internshipMinutes: this.number(row?.internshipMinutes),
    };
  }

  private dashboard(row: CohortDashboard): CohortDashboard {
    return {
      cohortId: this.text(row?.cohortId),
      cohortCode: this.text(row?.cohortCode),
      cohortName: this.text(row?.cohortName),
      learners: this.number(row?.learners),
      plannedMinutes: this.number(row?.plannedMinutes),
      deliveredMinutes: this.number(row?.deliveredMinutes),
      presentMinutes: this.number(row?.presentMinutes),
      attendanceRate: this.number(row?.attendanceRate),
      averageCompetencyProgress: this.number(row?.averageCompetencyProgress),
      workplacePeriodsCompleted: this.number(row?.workplacePeriodsCompleted),
      certificationEligible: this.number(row?.certificationEligible),
      certificationObtained: this.number(row?.certificationObtained),
      openAlerts: this.number(row?.openAlerts),
    };
  }

  private average(values: number[]): number {
    return values.length ? Math.round(values.reduce((sum, value) => sum + this.number(value), 0) / values.length) : 0;
  }
  private percent(part: number, total: number): number {
    return total > 0 ? Math.max(0, Math.min(100, Math.round((part / total) * 100))) : 0;
  }
  private hours(value: unknown): number {
    return Math.round((this.number(value) / 60) * 10) / 10;
  }
  private number(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
}
