import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { ContextualPromotionSummary } from "../models/contextual-promotions.models";
import { ApplicationNotificationService } from "../notifications/application-notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { ReportingApiService } from "../reporting/reporting-api.service";
import type { CohortDashboard, CohortLearnerDashboard } from "../reporting/reporting.models";
import { TrainingCatalogApiService, type CohortResponse } from "../training/training-catalog-api.service";
import { WorkspaceContextService } from "../workspace/workspace-context.service";
import { ReferentialApiStoreService } from "./referential-api-store.service";

@Injectable({ providedIn: "root" })
export class CohortApiStoreService {
  private readonly api = inject(TrainingCatalogApiService);
  private readonly workspace = inject(WorkspaceContextService);
  private readonly referentials = inject(ReferentialApiStoreService);
  private readonly reporting = inject(ReportingApiService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(ApplicationNotificationService);

  private readonly rowsSignal = signal<CohortResponse[]>([]);
  private readonly dashboardsSignal = signal<Record<string, CohortDashboard>>({});
  private readonly learnersSignal = signal<Record<string, CohortLearnerDashboard[]>>({});
  readonly loading = signal(false);
  readonly loadError = signal(false);
  private generation = 0;
  private request = 0;

  readonly promotions = computed<ContextualPromotionSummary[]>(() => {
    const organization = this.workspace.organization();
    const site = this.workspace.site();
    const program = this.workspace.program();
    if (!organization || !site || !program) return [];

    return this.rowsSignal().map((row) => {
      const referential = this.referentials.items().find(
        (item) => item.apiId === this.text(row.referentialVersionId) || item.id === this.text(row.referentialVersionId),
      );
      const dashboard = this.dashboardsSignal()[this.text(row.id)];
      const learnerRows = (this.learnersSignal()[this.text(row.id)] ?? []).filter((learner) => {
        const status = this.text(learner?.enrollmentStatus).toLowerCase();
        return status !== "withdrawn" && status !== "cancelled";
      });
      const learnerCount = learnerRows.length || this.number(row.learnerCount);
      const capacity = this.number(row.capacity);
      const displayedStudents = learnerCount;
      const referenceHours = this.number(referential?.totalHours);
      const plannedHours = dashboard
        ? Math.round(this.number(dashboard.plannedMinutes) / 60)
        : referenceHours * displayedStudents;
      const completedHours = dashboard
        ? Math.round(this.number(dashboard.deliveredMinutes) / 60)
        : 0;

      return {
        id: this.text(row.key) || this.text(row.id),
        offeringId: this.offeringKey(row.programOfferingId),
        organizationId: this.text(organization.id),
        organizationName: this.text(organization.name),
        siteId: this.text(site.id),
        siteName: this.text(site.name),
        siteCity: this.text(site.city),
        programId: this.text(program.id),
        programName: this.text(program.name),
        programCode: this.text(program.code),
        programIcon: this.text(program.icon),
        referentialVersionId: this.text(referential?.id) || this.text(row.referentialVersionId),
        referentialVersion: this.text(referential?.version),
        referentialCode: this.text(referential?.code),
        name: this.text(row.name),
        shortName: this.text(row.code),
        start: this.text(row.startDate),
        end: this.text(row.endDate),
        status: this.status(row.status),
        studentCount: displayedStudents,
        capacity,
        students: learnerRows.map((learner) => this.learnerSummary(learner)),
        manager: this.text(row.pedagogicalManagerDisplayName),
        plannedHours,
        completedHours,
        remainingHours: Math.max(0, plannedHours - completedHours),
        catchupHours: this.round1(learnerRows.reduce((sum, learner) => sum + this.number(learner.catchupMinutes), 0) / 60),
        attendanceRate: dashboard
          ? this.number(dashboard.attendanceRate)
          : this.average(learnerRows.map((learner) => this.number(learner.attendanceRate))),
        averageProgress: dashboard
          ? this.number(dashboard.averageCompetencyProgress)
          : this.average(learnerRows.map((learner) => this.number(learner.averageCompetencyProgress))),
      };
    });
  });

  constructor() {
    effect(() => {
      const organizationId = this.workspace.organization()?.apiId ?? "";
      const siteId = this.workspace.site()?.apiId ?? "";
      const programId = this.workspace.program()?.apiId ?? "";
      const ready = this.workspace.remoteWorkspaceLoaded();
      const generation = ++this.generation;
      this.rowsSignal.set([]);
      this.dashboardsSignal.set({});
      this.learnersSignal.set({});
      this.loadError.set(false);
      if (ready && organizationId && siteId && programId)
        void this.reload(generation, { organizationId, siteId, programId });
    });

    effect(() => {
      const event = this.realtime.lastEvent();
      if (!event || !/^pedagora\.training\.(cohort|enrollment)\./.test(event.typeKey)) return;
      untracked(() => {
        if (this.workspace.remoteWorkspaceLoaded()) void this.reload();
      });
    });
  }

  async reload(
    generation = this.generation,
    filters = this.currentFilters(),
  ): Promise<boolean> {
    if (!filters.organizationId || !filters.siteId || !filters.programId) {
      this.rowsSignal.set([]);
      this.dashboardsSignal.set({});
      this.learnersSignal.set({});
      return true;
    }

    const request = ++this.request;
    this.loading.set(true);
    try {
      const rows = await this.api.list(filters);
      if (generation !== this.generation || request !== this.request) return false;
      const safeRows = Array.isArray(rows) ? rows.map((row) => this.normalize(row)) : [];
      this.rowsSignal.set(safeRows);
      this.loadError.set(false);
      await this.loadDashboards(safeRows, generation, request);
      return true;
    } catch {
      if (generation === this.generation && request === this.request) {
        this.rowsSignal.set([]);
        this.dashboardsSignal.set({});
        this.learnersSignal.set({});
        this.loadError.set(true);
        this.notifications.error("promotions.api.loadFailed", "/promotions");
      }
      return false;
    } finally {
      if (generation === this.generation && request === this.request) this.loading.set(false);
    }
  }

  async create(payload: {
    name: string;
    startDate: string;
    endDate: string;
    capacity: number;
    referentialVersionId: string;
    status: CohortResponse["status"];
    managerUserId: string;
    managerDisplayName: string;
  }): Promise<CohortResponse | null> {
    const offering = this.workspace.activeOfferingForContext();
    const referential = this.referentials.items().find(
      (item) => item.id === payload.referentialVersionId || item.apiId === payload.referentialVersionId,
    );
    const selectedProgram = this.workspace.program();
    if (!offering?.apiId || !referential?.apiId || referential.status !== "active" ||
        !selectedProgram || (referential.programId !== selectedProgram.id && referential.programApiId !== selectedProgram.apiId) ||
        !this.text(payload.managerUserId).trim()) {
      this.notifications.error("promotions.api.invalidContext", "/promotions");
      return null;
    }

    try {
      const response = await this.api.createCohort({
        programOfferingId: offering.apiId,
        referentialVersionId: referential.apiId,
        code: this.createCode(payload.name, payload.startDate),
        name: this.text(payload.name).trim(),
        startDate: this.text(payload.startDate),
        endDate: this.text(payload.endDate),
        capacity: Math.max(1, this.number(payload.capacity)),
        pedagogicalManagerAuthGateUserId: this.text(payload.managerUserId) || null,
        pedagogicalManagerDisplayName: this.text(payload.managerDisplayName) || null,
        externalKey: null,
        initialStatus: payload.status === "draft" || payload.status === "active" ? payload.status : "planned",
      });
      if (!response?.id || !response?.organizationId || !response?.siteId ||
          response.organizationId !== this.currentFilters().organizationId ||
          response.siteId !== this.currentFilters().siteId) {
        this.notifications.error("promotions.api.invalidResponse", "/promotions");
        return null;
      }
      const saved = this.normalize(response);
      // A previous server version could commit a different initial status. Do not hide
      // the committed cohort or encourage another POST; show its actual state and warn.
      if (saved.status !== payload.status)
        this.notifications.error("promotions.api.initialStatusMismatch", "/promotions");

      this.upsert(saved);
      this.workspace.applySavedCohort(saved);
      const workspaceReloaded = await this.reloadWorkspaceSafely();
      const refreshed = await this.reload();
      if (!workspaceReloaded || !refreshed) {
        // The POST already committed: preserve its canonical representation on read failures.
        if (!refreshed) this.upsert(saved);
        this.notifications.error("promotions.api.refreshFailed", "/promotions");
      }
      // Return the committed server resource, independent of reporting or workspace GET availability.
      return saved;
    } catch {
      this.notifications.error("promotions.api.createFailed", "/promotions");
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    const row = this.rowsSignal().find((item) => (item.key || item.id) === id || item.id === id);
    if (!row?.id) return false;
    try {
      await this.api.deleteCohort(row.id);
      this.rowsSignal.update((items) => items.filter((item) => item.id !== row.id));
      const workspaceReloaded = await this.reloadWorkspaceSafely();
      await this.reload();
      if (!workspaceReloaded) this.notifications.error("promotions.api.refreshFailed", "/promotions");
      return true;
    } catch (error: any) {
      const code = typeof error?.error?.code === "string" ? error.error.code : typeof error?.code === "string" ? error.code : "";
      this.notifications.error(code ? `backendErrors.${code}` : "promotions.api.deleteFailed", "/promotions");
      return false;
    }
  }

  private async loadDashboards(rows: CohortResponse[], generation: number, request: number): Promise<void> {
    if (!rows.length) {
      this.dashboardsSignal.set({});
      this.learnersSignal.set({});
      return;
    }

    const settled = await Promise.all(
      rows.map(async (row) => {
        const [dashboard, learners] = await Promise.allSettled([
          firstValueFrom(this.reporting.cohortDashboard(row.id)),
          firstValueFrom(this.reporting.cohortLearners(row.id)),
        ]);
        return { dashboard, learners };
      }),
    );
    if (generation !== this.generation || request !== this.request) return;

    const reports: Record<string, CohortDashboard> = {};
    const learnersByCohort: Record<string, CohortLearnerDashboard[]> = {};
    let failed = false;
    settled.forEach((result, index) => {
      const id = rows[index].id;
      if (result.dashboard.status === "fulfilled") reports[id] = result.dashboard.value;
      else failed = true;
      if (result.learners.status === "fulfilled") learnersByCohort[id] = Array.isArray(result.learners.value) ? result.learners.value : [];
      else { failed = true; learnersByCohort[id] = []; }
    });
    this.dashboardsSignal.set(reports);
    this.learnersSignal.set(learnersByCohort);
    if (failed) this.notifications.error("promotions.api.metricsFailed", "/promotions");
  }

  private async reloadWorkspaceSafely(): Promise<boolean> {
    try {
      await this.workspace.reload();
      return !this.workspace.remoteWorkspaceError();
    } catch {
      return false;
    }
  }

  private currentFilters(): { organizationId?: string; siteId?: string; programId?: string } {
    return {
      organizationId: this.workspace.organization()?.apiId ?? "",
      siteId: this.workspace.site()?.apiId ?? "",
      programId: this.workspace.program()?.apiId ?? "",
    };
  }

  private upsert(row: CohortResponse): void {
    this.rowsSignal.update((items) => {
      const index = items.findIndex((item) => item.id === row.id);
      return index < 0
        ? [row, ...items]
        : items.map((item, i) => (i === index ? row : item));
    });
  }

  private offeringKey(apiId: unknown): string {
    return this.text(apiId);
  }

  private createCode(name: string, startDate: string): string {
    const slug = this.text(name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 42);
    const year = /^\d{4}/.test(startDate) ? startDate.slice(0, 4) : "0000";
    const uid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Date.now().toString(36).toUpperCase();
    return `${slug || "PROMO"}-${year}-${uid}`.slice(0, 64);
  }

  private normalize(row: CohortResponse): CohortResponse {
    return {
      id: this.text(row?.id),
      key: this.text(row?.key) || this.text(row?.id),
      organizationId: this.text(row?.organizationId),
      siteId: this.text(row?.siteId),
      programOfferingId: this.text(row?.programOfferingId),
      referentialVersionId: this.text(row?.referentialVersionId),
      code: this.text(row?.code),
      name: this.text(row?.name),
      startDate: this.text(row?.startDate),
      endDate: this.text(row?.endDate),
      capacity: this.number(row?.capacity),
      learnerCount: this.number(row?.learnerCount),
      pedagogicalManagerAuthGateUserId: this.text(row?.pedagogicalManagerAuthGateUserId) || null,
      pedagogicalManagerDisplayName: this.text(row?.pedagogicalManagerDisplayName),
      status: this.status(row?.status),
    };
  }

  private status(value: unknown): CohortResponse["status"] {
    return value === "draft" || value === "active" || value === "completed" || value === "cancelled"
      ? value
      : "planned";
  }

  private learnerSummary(row: CohortLearnerDashboard) {
    const progress = this.round1(this.number(row?.averageCompetencyProgress));
    const catchupHours = this.round1(this.number(row?.catchupMinutes) / 60);
    const completedHours = this.round1(this.number(row?.completedMinutes) / 60);
    const enrollment = this.text(row?.enrollmentStatus).toLowerCase();
    const status: "good" | "warning" | "late" =
      catchupHours > 0 || this.number(row?.absentCount) > 0 || ["suspended", "withdrawn", "cancelled"].includes(enrollment)
        ? "late"
        : enrollment === "pending"
          ? "warning"
          : "good";
    return {
      enrollmentId: this.text(row?.enrollmentId),
      learnerProfileId: this.text(row?.learnerProfileId),
      firstName: this.text(row?.firstName),
      lastName: this.text(row?.lastName),
      progress,
      completedHours,
      catchupHours,
      status,
    };
  }

  private average(values: number[]): number {
    if (!values.length) return 0;
    return this.round1(values.reduce((sum, value) => sum + this.number(value), 0) / values.length);
  }

  private round1(value: number): number {
    return Math.round(this.number(value) * 10) / 10;
  }

  private text(value: unknown): string {
    return typeof value === "string" ? value : "";
  }

  private number(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
}
