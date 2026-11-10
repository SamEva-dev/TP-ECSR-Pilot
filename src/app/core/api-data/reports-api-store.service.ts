import {
  Injectable,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { StudentStatus } from "../models/app.models";
import type {
  AuditLogItem,
  ReportPromotionOption,
  ReportStudentRow,
} from "../models/reports.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import type {
  AuditEntry,
  CohortLearnerDashboard,
} from "../reporting/reporting.models";
import { ReportingApiService } from "../reporting/reporting-api.service";
import { WorkplaceApiService } from "../workplace/workplace-api.service";
import type { WorkplacePeriodDto } from "../workplace/workplace.models";
import { SessionService } from "../session/session.service";
import { TranslateService } from "../i18n/translate.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";

@Injectable({ providedIn: "root" })
export class ReportsApiStoreService {
  private readonly reporting = inject(ReportingApiService);
  private readonly workplace = inject(WorkplaceApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly session = inject(SessionService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);
  private readonly translate = inject(TranslateService);

  private readonly promotionIdSignal = signal("");
  private readonly studentsSignal = signal<ReportStudentRow[]>([]);
  private readonly auditSignal = signal<AuditLogItem[]>([]);
  private readonly internshipPeriodsSignal = signal<WorkplacePeriodDto[]>([]);
  private readonly internshipEnabledSignal = signal(false);
  readonly internshipLoading = signal(false);
  readonly internshipLoadError = signal(false);
  private internshipRequest = 0;
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  // Always expose a value that exists in the rendered <select> options.
  // Otherwise the native select displays the first option while the report still
  // uses a stale cohort ID (task-45).
  readonly promotionId = computed(() => {
    const options = this.promotions();
    const requested = this.promotionIdSignal();
    if (options.some((row) => row.id === requested)) return requested;
    const restored = this.restoredPromotion();
    if (options.some((row) => row.id === restored)) return restored;
    const globalId = this.text(this.session.promotionId());
    if (options.some((row) => row.id === globalId)) return globalId;
    return options[0]?.id ?? "";
  });
  readonly hasSelectedPromotion = computed(() =>
    this.promotions().some((row) => row.id === this.promotionId() && !!row.apiId),
  );
  readonly students = this.studentsSignal.asReadonly();
  readonly auditLog = this.auditSignal.asReadonly();
  readonly internshipPeriods = this.internshipPeriodsSignal.asReadonly();
  readonly internshipPlannedHours = computed(() =>
    this.round1(this.internshipPeriodsSignal().reduce((sum, p) =>
      sum + this.number(p.plannedHours), 0)),
  );
  readonly internshipCompletedHours = computed(() =>
    this.round1(this.internshipPeriodsSignal().reduce((sum, p) =>
      sum + this.number(p.completedHours), 0)),
  );
  readonly internshipRemainingHours = computed(() =>
    this.round1(this.internshipPeriodsSignal().reduce((sum, p) =>
      sum + Math.max(0, this.number(p.plannedHours) - this.number(p.completedHours)), 0)),
  );

  readonly promotions = computed<ReportPromotionOption[]>(() =>
    this.workspace
      .cohorts()
      .map((cohort) => ({
        id: this.text(cohort.id),
        apiId: this.text(cohort.apiId),
        name: this.text(cohort.name),
      }))
      .filter((cohort) => cohort.id && cohort.apiId),
  );

  readonly promotionName = computed(
    () =>
      this.promotions().find(
        (promotion) => promotion.id === this.promotionId(),
      )?.name ?? "",
  );
  readonly totalCompletedHours = computed(() =>
    this.round1(
      this.studentsSignal().reduce(
        (sum, row) => sum + this.number(row.completedHours),
        0,
      ),
    ),
  );
  readonly totalCatchupHours = computed(() =>
    this.round1(
      this.studentsSignal().reduce(
        (sum, row) => sum + this.number(row.catchupHours),
        0,
      ),
    ),
  );
  readonly averageProgress = computed(() => {
    const rows = this.studentsSignal();
    return rows.length
      ? Math.round(
          rows.reduce((sum, row) => sum + this.number(row.progress), 0) /
            rows.length,
        )
      : 0;
  });

  readonly canSeeAudit = computed(() => {
    const role = this.session.role();
    return role === "direction" || role === "secretariat";
  });

  constructor() {
    void this.realtime.start().catch(() => undefined);

    effect(() => {
      const ready = this.workspace.remoteWorkspaceLoaded();
      const options = this.promotions();
      const resolved = this.promotionId();
      const generation = ++this.generation;
      this.studentsSignal.set([]);
      this.auditSignal.set([]);
      this.internshipPeriodsSignal.set([]);
      this.internshipLoadError.set(false);
      this.loadError.set(false);
      if (ready) void this.load(generation, resolved);
    });

    effect(() => {
      const enabled = this.internshipEnabledSignal();
      const ready = this.workspace.remoteWorkspaceLoaded();
      const cohortId = this.promotionId();
      const generation = this.generation;
      const request = ++this.internshipRequest;
      this.internshipPeriodsSignal.set([]);
      this.internshipLoadError.set(false);
      if (enabled && ready && cohortId) {
        void this.loadInternshipPeriods(generation, request, cohortId);
      } else {
        this.internshipLoading.set(false);
      }
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (
        !event ||
        !/^pedagora\.(training|learning|workplace|certification|audit)\./.test(
          event.typeKey,
        )
      )
        return;
      untracked(() => void this.reload());
    });
  }

  selectPromotion(id: string): void {
    const selected = this.text(id);
    if (!this.promotions().some(row => row.id === selected)) return;
    this.promotionIdSignal.set(selected);
    const key = this.promotionStorageKey();
    if (key && typeof sessionStorage !== "undefined") sessionStorage.setItem(key, selected);
  }

  private promotionStorageKey(): string {
    const organization = this.text(this.session.session()?.organizationId);
    return organization ? `pedagora.reports.selectedPromotion.${organization}` : "";
  }

  private restoredPromotion(): string {
    const key = this.promotionStorageKey();
    if (!key || typeof sessionStorage === "undefined") return "";
    try { return this.text(sessionStorage.getItem(key)); } catch { return ""; }
  }

  async reload(): Promise<boolean> {
    const generation = ++this.generation;
    return this.load(generation, this.promotionId());
  }

  setInternshipReportEnabled(enabled: boolean): void {
    this.internshipEnabledSignal.set(enabled);
  }

  private async loadInternshipPeriods(
    generation: number,
    request: number,
    cohortId: string,
  ): Promise<void> {
    const option = this.promotions().find((row) => row.id === cohortId);
    if (!option?.apiId) return;
    this.internshipLoading.set(true);
    try {
      const periods = await this.workplace.getPeriods(option.apiId);
      if (generation !== this.generation || request !== this.internshipRequest ||
          !this.internshipEnabledSignal() || this.promotionId() !== cohortId) return;
      // The backend scopes the query to the cohort and checks permissions.
      // Ignore cancelled/deleted periods for the active internship report.
      this.internshipPeriodsSignal.set((Array.isArray(periods) ? periods : [])
        .filter((period) => period.cohortId === option.apiId &&
          period.status !== "cancelled" && period.status !== "deleted"));
    } catch {
      if (generation === this.generation && request === this.internshipRequest) {
        this.internshipPeriodsSignal.set([]);
        this.internshipLoadError.set(true);
        this.notifications.error("reports.api.loadFailed", "/rapports");
      }
    } finally {
      if (generation === this.generation && request === this.internshipRequest)
        this.internshipLoading.set(false);
    }
  }

  async exportExcel(): Promise<boolean> {
    const option = this.promotions().find(
      (row) => row.id === this.promotionId(),
    );
    if (!option?.apiId) {
      this.notifications.error("reports.api.exportFailed", "/rapports");
      return false;
    }
    try {
      const blob = await firstValueFrom(
        this.reporting.exportCohort(option.apiId),
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${this.safeFileName(option.name) || "promotion"}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      this.notifications.error("reports.api.exportFailed", "/rapports");
      return false;
    }
  }

  private async load(
    generation: number,
    promotionId: string,
  ): Promise<boolean> {
    const option = this.promotions().find((row) => row.id === promotionId);
    const request = ++this.request;
    this.loading.set(true);
    try {
      const organizationApiId = this.text(this.workspace.organization()?.apiId);
      const learnerPromise = option?.apiId
        ? firstValueFrom(this.reporting.cohortLearners(option.apiId))
        : Promise.resolve([] as CohortLearnerDashboard[]);
      const auditPromise =
        this.canSeeAudit() && organizationApiId
          ? firstValueFrom(
              this.reporting.audit({
                organizationId: organizationApiId,
                page: 1,
                pageSize: 50,
              }),
            )
          : Promise.resolve({ items: [], page: 1, pageSize: 50, total: 0 });
      const [learnersResult, auditResult] = await Promise.allSettled([
        learnerPromise,
        auditPromise,
      ]);
      if (generation !== this.generation || request !== this.request)
        return false;

      const learners =
        learnersResult.status === "fulfilled" &&
        Array.isArray(learnersResult.value)
          ? learnersResult.value
          : [];
      const audit =
        auditResult.status === "fulfilled" &&
        Array.isArray(auditResult.value?.items)
          ? auditResult.value.items
          : [];
      this.studentsSignal.set(learners.map((row) => this.student(row)));
      this.auditSignal.set(audit.map((row) => this.audit(row)));
      const failed =
        learnersResult.status === "rejected" ||
        auditResult.status === "rejected";
      this.loadError.set(failed);
      if (failed) {
        this.notifications.error(
          learnersResult.status === "rejected"
            ? "reports.api.loadFailed"
            : "reports.api.auditFailed",
          "/rapports",
        );
      }
      return !failed;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.studentsSignal.set([]);
        this.auditSignal.set([]);
        this.loadError.set(true);
        this.notifications.error("reports.api.loadFailed", "/rapports");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request)
        this.loading.set(false);
    }
  }

  private student(row: CohortLearnerDashboard): ReportStudentRow {
    return {
      id: this.text(row?.enrollmentId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      progress: this.number(row?.averageCompetencyProgress),
      completedHours: this.hours(row?.completedMinutes),
      plannedHours: this.hours(row?.plannedMinutes),
      catchupHours: this.hours(row?.catchupMinutes),
      validatedSheets: this.number(row?.validatedTopics),
      totalSheets: this.number(row?.totalTopics),
      status: this.status(row),
    };
  }

  private audit(row: AuditEntry): AuditLogItem {
    return {
      id: this.text(row?.id),
      dateTime: this.formatDateTime(row?.occurredAtUtc),
      author: this.text(row?.userDisplayName),
      actionKey: this.text(row?.action),
      oldValue: "",
      newValue: "",
      reasonKey: "",
    };
  }

  private status(row: CohortLearnerDashboard): StudentStatus {
    const enrollment = this.text(row?.enrollmentStatus).toLowerCase();
    if (
      this.number(row?.catchupMinutes) > 0 ||
      this.number(row?.absentCount) > 0 ||
      enrollment === "suspended" ||
      enrollment === "withdrawn" ||
      enrollment === "cancelled"
    )
      return "late";
    if (enrollment === "pending") return "warning";
    return "good";
  }

  private formatDateTime(value: unknown): string {
    const date = new Date(this.text(value));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(
      this.translate.locale() === "en" ? "en-GB" : "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Europe/Paris",
      },
    ).format(date);
  }

  private safeFileName(value: string): string {
    return this.text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  private hours(value: unknown): number {
    return this.round1(this.number(value) / 60);
  }
  private round1(value: number): number {
    return Math.round(this.number(value) * 10) / 10;
  }
  private number(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }
}
